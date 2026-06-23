#!/usr/bin/env python3
"""Hent aksjekurs ved første handelsdag hvert år -> brreg.aksjekurs.

For børsnoterte selskaper: slår opp orgnr fra selskapsnavn i aksjonærregisteret,
henter historiske kurser fra Yahoo Finance (Oslo Børs = .OL), plukker første
handelsdag i hvert år, og upserter via Supabase Management API.

Kobling orgnr->ticker lagres i brreg.noterte_selskap. Utvid MAPPING under for
flere selskaper. Kjør på nytt årlig for å legge til nytt år.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-aksjekurs.py [fra_aar] [til_aar]
"""
import os, sys, json, time, datetime, subprocess, urllib.request

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
FRA = int(sys.argv[1]) if len(sys.argv) > 1 else 2005
TIL = int(sys.argv[2]) if len(sys.argv) > 2 else datetime.date.today().year

# (Yahoo-ticker, navne-mønster for ILIKE mot aksjonaerer.selskap).
# Kun norsk-registrerte selskaper finnes i aksjonærregisteret; utenlandske
# (f.eks. Frontline/Bakkafrost) resolver til ingen orgnr og hoppes over.
MAPPING = [
    ("EQNR.OL", "EQUINOR ASA"), ("DNB.OL", "DNB BANK ASA"), ("TEL.OL", "TELENOR ASA"),
    ("NHY.OL", "NORSK HYDRO ASA"), ("YAR.OL", "YARA INTERNATIONAL ASA"),
    ("MOWI.OL", "MOWI ASA"), ("AKERBP.OL", "AKER BP ASA"), ("AKER.OL", "AKER ASA"),
    ("ORK.OL", "ORKLA ASA"), ("KOG.OL", "KONGSBERG GRUPPEN ASA"),
    ("STB.OL", "STOREBRAND ASA"), ("GJF.OL", "GJENSIDIGE FORSIKRING ASA"),
    ("SCHA.OL", "SCHIBSTED%"), ("TOM.OL", "TOMRA SYSTEMS ASA"), ("SALM.OL", "SALMAR ASA"),
    ("LSG.OL", "LERØY SEAFOOD GROUP ASA"), ("NAS.OL", "NORWEGIAN AIR SHUTTLE ASA"),
    ("ELK.OL", "ELKEM ASA"), ("NOD.OL", "NORDIC SEMICONDUCTOR ASA"),
    ("VEI.OL", "VEIDEKKE ASA"), ("WAWI.OL", "WALLENIUS WILHELMSEN ASA"),
    ("BRG.OL", "BORREGAARD ASA"), ("EPR.OL", "EUROPRIS ASA"), ("ENTRA.OL", "ENTRA ASA"),
    ("AKSO.OL", "AKER SOLUTIONS ASA"), ("DNO.OL", "DNO ASA"), ("VAR.OL", "VÅR ENERGI ASA"),
    ("ATEA.OL", "ATEA ASA"), ("AUTO.OL", "AUTOSTORE HOLDINGS%"),
    ("PROT.OL", "PROTECTOR FORSIKRING ASA"), ("SRBANK.OL", "SPAREBANK 1 SR-BANK ASA"),
    ("KIT.OL", "KITRON ASA"), ("HEX.OL", "HEXAGON COMPOSITES ASA"),
    ("CRAYON.OL", "CRAYON GROUP HOLDING ASA"), ("MPCC.OL", "MPC CONTAINER SHIPS ASA"),
    ("TGS.OL", "TGS ASA"), ("SCATC.OL", "SCATEC ASA"),
    ("ODF.OL", "ODFJELL SE%"), ("AGAS.OL", "AVANCE GAS HOLDING%"),
]


def run_sql(query, retries=4):
    # Bruk curl (som run-sql.sh): Cloudflare foran Management API blokkerer
    # Python-urllib sin TLS-fingerprint, men slipper curl gjennom.
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = subprocess.run(
            ["curl", "-sS", "-m", "120", "-X", "POST", QURL,
             "-H", f"Authorization: Bearer {TOK}",
             "-H", "Content-Type: application/json", "--data", body],
            capture_output=True, text=True).stdout
        try:
            data = json.loads(out)
        except json.JSONDecodeError:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 3)
                continue
            raise RuntimeError(f"Uventet svar: {out[:200]}")
        if isinstance(data, dict) and data.get("message"):  # API-feil/rate-limit
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 3)
                continue
            raise RuntimeError(data["message"])
        return data


def q(s):  # escape single quotes for SQL literal
    return s.replace("'", "''")


def resolve_all():
    """Ett kall: finn orgnr for alle navne-mønstre samtidig. Resolver mot
    brreg.enheter (trigram-indeksert navn) – raskt og presist på org.form."""
    vals = ",".join(f"('{t}','{q(p)}')" for t, p in MAPPING)
    rows = run_sql(
        f"with m(ticker, pat) as (values {vals}) "
        "select m.ticker, (select e.organisasjonsnummer from brreg.enheter e "
        "where e.navn ilike m.pat and e.organisasjonsform_kode in ('ASA','AS') "
        "order by (e.organisasjonsform_kode='ASA') desc, length(e.navn) asc limit 1) as orgnr "
        "from m")
    return {r["ticker"]: r["orgnr"] for r in rows}


def yahoo(ticker):
    p1 = int(datetime.datetime(FRA, 1, 1).timestamp())
    p2 = int(datetime.datetime(TIL, 12, 31).timestamp())
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
           f"?period1={p1}&period2={p2}&interval=1d")
    # Yahoo blokkerer Python-urllib (TLS-fingerprint) men slipper curl gjennom.
    out = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-H", "User-Agent: Mozilla/5.0", url],
        capture_output=True, text=True).stdout
    d = json.loads(out)
    res = d["chart"]["result"][0]
    cur = res["meta"].get("currency", "NOK")
    ts = res.get("timestamp", [])
    close = res["indicators"]["quote"][0].get("close", [])
    per_year = {}  # første handelsdag med gyldig kurs per år
    for t, c in zip(ts, close):
        if c is None:
            continue
        dt = datetime.datetime.utcfromtimestamp(t).date()
        if dt.year not in per_year or dt < per_year[dt.year][0]:
            per_year[dt.year] = (dt, c)
    return cur, per_year


def main():
    print(f"Henter kurser {FRA}-{TIL} for {len(MAPPING)} selskaper\n")
    orgmap = resolve_all()
    notert, kurs_rader = [], []
    for ticker, pat in MAPPING:
        orgnr = orgmap.get(ticker)
        if not orgnr:
            print(f"  – {ticker:10} ({pat}) -> ingen orgnr, hopper over")
            continue
        try:
            cur, per_year = yahoo(ticker)
        except Exception as e:
            print(f"  ! {ticker:10} yahoo-feil: {e}")
            continue
        notert.append((orgnr, ticker, pat))
        n = 0
        for yr, (dt, c) in per_year.items():
            if FRA <= yr <= TIL:
                kurs_rader.append((orgnr, yr, dt.isoformat(), round(c, 4), cur))
                n += 1
        print(f"  ✓ {ticker:10} orgnr {orgnr}  {n} år")
        time.sleep(0.25)

    if notert:
        vals = ",".join(f"('{o}','{t}','{q(p)}')" for o, t, p in notert)
        run_sql("insert into brreg.noterte_selskap (orgnr,ticker,navn) values " + vals +
                " on conflict (orgnr) do update set ticker=excluded.ticker, navn=excluded.navn")
    for i in range(0, len(kurs_rader), 500):
        batch = kurs_rader[i:i + 500]
        vals = ",".join(f"('{o}',{yr},'{dt}',{c},'{cur}')" for o, yr, dt, c, cur in batch)
        run_sql("insert into brreg.aksjekurs (orgnr,aar,dato,kurs,valuta) values " + vals +
                " on conflict (orgnr,aar) do update set kurs=excluded.kurs, dato=excluded.dato, valuta=excluded.valuta")
    print(f"\nFerdig: {len(notert)} selskaper, {len(kurs_rader)} kurs-rader lastet.")


if __name__ == "__main__":
    main()
