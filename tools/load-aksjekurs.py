#!/usr/bin/env python3
"""Hent aksjekurs ved første handelsdag hvert år -> brreg.aksjekurs.

Datadrevet: børsnoterte selskaper har tusenvis av aksjonærer. Henter kandidater
(selskaper med mange eiere) fra aksjonærregisteret, finner Yahoo-ticker automatisk
via Yahoos søke-API, og henter historiske kurser (Oslo Børs = .OL). Plukker første
handelsdag i hvert år og upserter via Supabase Management API.

Kobling orgnr->ticker lagres i brreg.noterte_selskap.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-aksjekurs.py [fra_aar] [til_aar] [min_eiere]
"""
import os, sys, re, json, time, datetime, subprocess, urllib.parse

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
# Posisjonsargumenter (uten flagg som --asa-only/--force): fra_aar, til_aar, min_eiere.
POS = [a for a in sys.argv[1:] if not a.startswith("-")]
FRA = int(POS[0]) if len(POS) > 0 else 2005
TIL = int(POS[1]) if len(POS) > 1 else datetime.date.today().year
MIN_EIERE = int(POS[2]) if len(POS) > 2 else 150


def curl(args, timeout=40):
    return subprocess.run(["curl", "-sS", "--max-time", str(timeout)] + args,
                          capture_output=True, text=True).stdout


def run_sql(query, retries=4):
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = curl(["-m", "120", "-X", "POST", QURL,
                    "-H", f"Authorization: Bearer {TOK}",
                    "-H", "Content-Type: application/json", "--data", body], timeout=120)
        try:
            data = json.loads(out)
        except json.JSONDecodeError:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 3); continue
            raise RuntimeError(f"Uventet svar: {out[:200]}")
        if isinstance(data, dict) and data.get("message"):
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 3); continue
            raise RuntimeError(data["message"])
        return data


def q(s):
    return s.replace("'", "''")


def kandidater(asa_only=False):
    """Kandidater for børsnotering, fra flere kilder slått sammen:

    1. Alle ASA-selskaper i Enhetsregisteret (børsnotering forutsetter normalt
       ASA – fanger også selskaper som er avnotert/oppløst senere).
    2. Selskaper med mange aksjonærer i ett eller flere år (fanger børsnoterte
       AS, f.eks. på Euronext Growth, og historisk noterte som er borte i dag).

    asa_only=True hopper over (2) – mye raskere og høy treffrate (de fleste
    ASA er/var børsnotert), uten støy fra sparebanker, idrettslag o.l.
    """
    kand = {}
    # 1) ASA-selskaper.
    for r in run_sql(
            "select organisasjonsnummer as orgnr, navn from brreg.enheter "
            "where organisasjonsform_kode = 'ASA' and navn is not null"):
        kand[r["orgnr"]] = r["navn"]
    # 2) Selskaper med mange eiere – per år (partisjonsvis = raskt).
    if not asa_only:
        for yr in range(FRA, TIL + 1):
            try:
                rows = run_sql(
                    f"select orgnr, max(selskap) as navn, count(*) as eiere "
                    f"from brreg.aksjonaerer where aar = {yr} group by orgnr "
                    f"having count(*) > {MIN_EIERE}")
            except Exception:
                continue
            for r in rows:
                kand.setdefault(r["orgnr"], r["navn"])
    return list(kand.items())


def yahoo_search(navn):
    """Finn .OL-ticker for et selskapsnavn via Yahoos søke-API, med navnesjekk."""
    sok = re.sub(r"\s+(ASA|AS|SE|ASA\.)\s*$", "", navn).strip() or navn
    url = ("https://query2.finance.yahoo.com/v1/finance/search?q="
           + urllib.parse.quote(sok) + "&quotesCount=12&newsCount=0&listsCount=0")
    d = None
    for attempt in range(4):
        out = curl(["-H", "User-Agent: Mozilla/5.0", "-H", "Accept: */*", url], timeout=20)
        try:
            d = json.loads(out); break
        except json.JSONDecodeError:
            time.sleep(2 ** attempt)  # trolig rate-limit (429/403) – vent og prøv igjen
    if d is None:
        return None
    toks = [t for t in re.findall(r"[A-ZÆØÅ0-9]{4,}", navn.upper())]
    # Samle alle Oslo Børs-treff (.OL) med navnesjekk, og ranger: høyest score,
    # deretter korteste symbol (primærtickeren er som regel kortere enn
    # sekundærlinjer som ender på «O.OL»).
    treff = []
    for qt in d.get("quotes", []):
        sym = qt.get("symbol", "")
        if not sym.endswith(".OL"):
            continue
        nm = (str(qt.get("shortname", "")) + " " + str(qt.get("longname", ""))).upper()
        if toks and not any(t in nm for t in toks):
            continue
        score = qt.get("score", 0) or 0
        # Korteste symbol først: primærtickeren (f.eks. ACR.OL, AKVA.OL) er
        # konsekvent kortere enn Yahoos sekundærlinjer (ACRO.OL, AKVAO.OL).
        # Score som sekundær sortering.
        treff.append((len(sym), -score, sym))
    if not treff:
        return None
    treff.sort()
    return treff[0][2]


def yahoo_kurs(ticker):
    p1 = int(datetime.datetime(FRA, 1, 1).timestamp())
    p2 = int(datetime.datetime(TIL, 12, 31).timestamp())
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
           f"?period1={p1}&period2={p2}&interval=1d")
    # Tål rate-limiting (tom/ugyldig respons) med backoff, og null-resultat.
    res = None
    for attempt in range(5):
        out = curl(["-H", "User-Agent: Mozilla/5.0", url], timeout=30)
        try:
            d = json.loads(out)
        except json.JSONDecodeError:
            time.sleep(2 ** attempt); continue
        chart = d.get("chart") or {}
        result = chart.get("result")
        if result:
            res = result[0]; break
        # error/null (ukjent ticker eller rate-limit) – vent litt og prøv igjen
        time.sleep(2 ** attempt)
    if res is None:
        return None, {}
    cur = res["meta"].get("currency", "NOK")
    ts = res.get("timestamp", []) or []
    quote = res["indicators"]["quote"][0]
    close = quote.get("close", []) or []
    per_year = {}
    for t, c in zip(ts, close):
        if c is None:
            continue
        dt = datetime.datetime.utcfromtimestamp(t).date()
        if dt.year not in per_year or dt < per_year[dt.year][0]:
            per_year[dt.year] = (dt, c)
    return cur, per_year


def upsert_notert(rows):
    if not rows:
        return
    vals = ",".join(f"('{o}','{t}','{q(n)}')" for o, t, n in rows)
    run_sql("insert into brreg.noterte_selskap (orgnr,ticker,navn) values " + vals +
            " on conflict (orgnr) do update set ticker=excluded.ticker, navn=excluded.navn")


def upsert_kurs(rows):
    for i in range(0, len(rows), 500):
        b = rows[i:i + 500]
        vals = ",".join(f"('{o}',{yr},'{dt}',{c},'{cur}')" for o, yr, dt, c, cur in b)
        run_sql("insert into brreg.aksjekurs (orgnr,aar,dato,kurs,valuta) values " + vals +
                " on conflict (orgnr,aar) do update set kurs=excluded.kurs, dato=excluded.dato, valuta=excluded.valuta")


def main():
    force = "--force" in sys.argv
    asa_only = "--asa-only" in sys.argv
    kand = kandidater(asa_only=asa_only)
    # Hopp over selskaper vi allerede har funnet ticker for (sparer Yahoo-kall),
    # med mindre --force er satt (da oppfriskes alle).
    alt = set()
    if not force:
        alt = {r["orgnr"] for r in run_sql("select distinct orgnr from brreg.noterte_selskap")}
    kand = [(o, n) for o, n in kand if o not in alt]
    print(f"{len(kand)} nye kandidater (ASA + >{MIN_EIERE} eiere). "
          f"{len(alt)} allerede løst. Slår opp ticker…\n")

    funnet, notert, kurs_rader = 0, [], []
    for idx, (orgnr, navn) in enumerate(kand, 1):
        try:
            ticker = yahoo_search(navn)
            if not ticker:
                continue
            cur, per_year = yahoo_kurs(ticker)
            # Yahoos «…O.OL»-linjer er ofte tomme duplikater (f.eks. AUSSO.OL),
            # mens den ekte tickeren mangler «O» (AUSS.OL). Prøv den som fallback.
            if not per_year and re.match(r"^[A-Z0-9]+O\.OL$", ticker):
                alt_ticker = ticker[:-4] + ".OL"  # fjern O før .OL
                cur2, per_year2 = yahoo_kurs(alt_ticker)
                if per_year2:
                    ticker, cur, per_year = alt_ticker, cur2, per_year2
            if not per_year:
                continue
            notert.append((orgnr, ticker, navn))
            n = 0
            for yr, (dt, c) in per_year.items():
                if FRA <= yr <= TIL:
                    kurs_rader.append((orgnr, yr, dt.isoformat(), round(c, 4), cur))
                    n += 1
            funnet += 1
            print(f"  ✓ {ticker:12} {navn[:42]:42} {n} år")
        except Exception as e:
            print(f"  ! {navn[:42]:42} feil: {str(e)[:40]}")
        # Lagre underveis hver 25. så delvis fremgang består.
        if idx % 25 == 0 and notert:
            upsert_notert(notert); upsert_kurs(kurs_rader)
            notert, kurs_rader = [], []
        time.sleep(1.5)  # rolig takt mot Yahoo for å unngå rate-limiting

    upsert_notert(notert)
    upsert_kurs(kurs_rader)
    print(f"\nFerdig: {funnet} børsnoterte selskaper med kurser lastet.")


if __name__ == "__main__":
    main()
