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
FRA = int(sys.argv[1]) if len(sys.argv) > 1 else 2005
TIL = int(sys.argv[2]) if len(sys.argv) > 2 else datetime.date.today().year
MIN_EIERE = int(sys.argv[3]) if len(sys.argv) > 3 else 400


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


def kandidater():
    """Selskaper med mange eiere i siste år = sannsynlig børsnotert."""
    rows = run_sql(
        f"select orgnr, max(selskap) as navn, count(*) as eiere "
        f"from brreg.aksjonaerer where aar = {TIL} group by orgnr "
        f"having count(*) > {MIN_EIERE} order by count(*) desc")
    return [(r["orgnr"], r["navn"]) for r in rows]


def yahoo_search(navn):
    """Finn .OL-ticker for et selskapsnavn via Yahoos søke-API, med navnesjekk."""
    sok = re.sub(r"\s+(ASA|AS|SE|ASA\.)\s*$", "", navn).strip() or navn
    url = ("https://query2.finance.yahoo.com/v1/finance/search?q="
           + urllib.parse.quote(sok) + "&quotesCount=8&newsCount=0&listsCount=0")
    out = curl(["-H", "User-Agent: Mozilla/5.0", "-H", "Accept: */*", url], timeout=20)
    try:
        d = json.loads(out)
    except json.JSONDecodeError:
        return None
    toks = [t for t in re.findall(r"[A-ZÆØÅ0-9]{4,}", navn.upper())]
    for qt in d.get("quotes", []):
        sym = qt.get("symbol", "")
        if sym.endswith(".OL"):
            nm = (str(qt.get("shortname", "")) + " " + str(qt.get("longname", ""))).upper()
            if not toks or any(t in nm for t in toks):
                return sym
    return None


def yahoo_kurs(ticker):
    p1 = int(datetime.datetime(FRA, 1, 1).timestamp())
    p2 = int(datetime.datetime(TIL, 12, 31).timestamp())
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
           f"?period1={p1}&period2={p2}&interval=1d")
    out = curl(["-H", "User-Agent: Mozilla/5.0", url], timeout=30)
    d = json.loads(out)
    res = d["chart"]["result"][0]
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
    kand = kandidater()
    print(f"{len(kand)} kandidater (>{MIN_EIERE} eiere). Slår opp ticker…\n")

    funnet, notert, kurs_rader = 0, [], []
    for idx, (orgnr, navn) in enumerate(kand, 1):
        try:
            ticker = yahoo_search(navn)
            if not ticker:
                continue
            cur, per_year = yahoo_kurs(ticker)
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
        time.sleep(0.35)

    upsert_notert(notert)
    upsert_kurs(kurs_rader)
    print(f"\nFerdig: {funnet} børsnoterte selskaper med kurser lastet.")


if __name__ == "__main__":
    main()
