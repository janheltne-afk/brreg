#!/usr/bin/env python3
"""Hent årsregnskap per organisasjonsnummer -> upsert til Supabase `brreg.regnskap`.

HTTPS-variant av Hop-workflowen `brreg-regnskap`, for miljøer der Postgres-porten
(5432) er stengt. Slår opp ett regnskap-oppslag per AS/ASA mot brreg
(`/regnskapsregisteret/regnskap/{orgnr}`), parser nøkkeltallene og upserter på
regnskap-`id` via Supabase Management API.

- Org uten regnskap gir 404 og hoppes over.
- Et selskap kan ha flere årsregnskap (ett objekt per år) – alle lagres.
- **Gjenopptakbar:** henter kun AS/ASA som ikke allerede finnes i `brreg.regnskap`,
  så avbrutt kjøring kan startes på nytt (idempotent på `id`).
- **Akkumulerer historikk:** kjør jevnlig (kvartal/år) for å fange nye årsregnskap.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<prosjekt-ref>
  python3 tools/load-regnskap.py [antall_workers] [selskapsformer]
    # f.eks: python3 tools/load-regnskap.py 12 AS,ASA
"""
import os, sys, json, subprocess, time, threading
from concurrent.futures import ThreadPoolExecutor

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
RKURL = "https://data.brreg.no/regnskapsregisteret/regnskap/"
WORKERS = int(sys.argv[1]) if len(sys.argv) > 1 else 12
FORMER = (sys.argv[2] if len(sys.argv) > 2 else "AS,ASA").split(",")

COLS = [
    ("id","bigint"),("organisasjonsnummer","text"),("journalnr","text"),
    ("regnskapstype","text"),("organisasjonsform","text"),("morselskap","boolean"),
    ("regnskapsperiode_fra","date"),("regnskapsperiode_til","date"),("valuta","text"),
    ("avviklingsregnskap","boolean"),("oppstillingsplan","text"),
    ("revisjon_ikke_revidert","boolean"),("revisjon_fravalg","boolean"),
    ("smaa_foretak","boolean"),("regnskapsregler","text"),
    ("sum_eiendeler","numeric"),("sum_omloepsmidler","numeric"),("sum_anleggsmidler","numeric"),
    ("sum_egenkapital_gjeld","numeric"),("sum_egenkapital","numeric"),("sum_gjeld","numeric"),
    ("sum_kortsiktig_gjeld","numeric"),("sum_langsiktig_gjeld","numeric"),
    ("sum_driftsinntekter","numeric"),("sum_driftskostnad","numeric"),("driftsresultat","numeric"),
    ("sum_finansinntekter","numeric"),("sum_finanskostnad","numeric"),("netto_finans","numeric"),
    ("ordinaert_resultat_foer_skatt","numeric"),("aarsresultat","numeric"),
]
COLNAMES = [c for c,_ in COLS]
RECORDSET = ", ".join(f"{c} {t}" for c,t in COLS)
UPDATE_SET = ", ".join(f"{c}=excluded.{c}" for c in COLNAMES if c != "id")

def g(o, *path):
    for k in path:
        if not isinstance(o, dict): return None
        o = o.get(k)
    return o

def rec(r):
    return {
        "id": r.get("id"),
        "organisasjonsnummer": g(r,"virksomhet","organisasjonsnummer"),
        "journalnr": r.get("journalnr"),
        "regnskapstype": r.get("regnskapstype"),
        "organisasjonsform": g(r,"virksomhet","organisasjonsform"),
        "morselskap": g(r,"virksomhet","morselskap"),
        "regnskapsperiode_fra": g(r,"regnskapsperiode","fraDato"),
        "regnskapsperiode_til": g(r,"regnskapsperiode","tilDato"),
        "valuta": r.get("valuta"),
        "avviklingsregnskap": r.get("avviklingsregnskap"),
        "oppstillingsplan": r.get("oppstillingsplan"),
        "revisjon_ikke_revidert": g(r,"revisjon","ikkeRevidertAarsregnskap"),
        "revisjon_fravalg": g(r,"revisjon","fravalgRevisjon"),
        "smaa_foretak": g(r,"regnkapsprinsipper","smaaForetak"),
        "regnskapsregler": g(r,"regnkapsprinsipper","regnskapsregler"),
        "sum_eiendeler": g(r,"eiendeler","sumEiendeler"),
        "sum_omloepsmidler": g(r,"eiendeler","omloepsmidler","sumOmloepsmidler"),
        "sum_anleggsmidler": g(r,"eiendeler","anleggsmidler","sumAnleggsmidler"),
        "sum_egenkapital_gjeld": g(r,"egenkapitalGjeld","sumEgenkapitalGjeld"),
        "sum_egenkapital": g(r,"egenkapitalGjeld","egenkapital","sumEgenkapital"),
        "sum_gjeld": g(r,"egenkapitalGjeld","gjeldOversikt","sumGjeld"),
        "sum_kortsiktig_gjeld": g(r,"egenkapitalGjeld","gjeldOversikt","kortsiktigGjeld","sumKortsiktigGjeld"),
        "sum_langsiktig_gjeld": g(r,"egenkapitalGjeld","gjeldOversikt","langsiktigGjeld","sumLangsiktigGjeld"),
        "sum_driftsinntekter": g(r,"resultatregnskapResultat","driftsresultat","driftsinntekter","sumDriftsinntekter"),
        "sum_driftskostnad": g(r,"resultatregnskapResultat","driftsresultat","driftskostnad","sumDriftskostnad"),
        "driftsresultat": g(r,"resultatregnskapResultat","driftsresultat","driftsresultat"),
        "sum_finansinntekter": g(r,"resultatregnskapResultat","finansresultat","finansinntekt","sumFinansinntekter"),
        "sum_finanskostnad": g(r,"resultatregnskapResultat","finansresultat","finanskostnad","sumFinanskostnad"),
        "netto_finans": g(r,"resultatregnskapResultat","finansresultat","nettoFinans"),
        "ordinaert_resultat_foer_skatt": g(r,"resultatregnskapResultat","ordinaertResultatFoerSkattekostnad"),
        "aarsresultat": g(r,"resultatregnskapResultat","aarsresultat"),
    }

def api(sql):
    body = json.dumps({"query": sql})
    for attempt in range(6):
        p = subprocess.run(["curl","-sS","-m","120","-X","POST",QURL,
            "-H",f"Authorization: Bearer {TOK}","-H","Content-Type: application/json",
            "--data-binary","@-"], input=body, capture_output=True, text=True)
        out = p.stdout.strip()
        if out.startswith("[") and '"message"' not in out:
            return json.loads(out)
        time.sleep(3*(attempt+1))
    raise SystemExit(f"Management API feilet: {out[:200]}")

def upsert(records):
    arr = json.dumps([{k: r[k] for k in COLNAMES} for r in records], ensure_ascii=False)
    sql = (f"INSERT INTO brreg.regnskap ({', '.join(COLNAMES)}) "
           f"SELECT {', '.join(COLNAMES)} FROM jsonb_to_recordset($j${arr}$j$::jsonb) "
           f"AS x({RECORDSET}) ON CONFLICT (id) DO UPDATE SET {UPDATE_SET};")
    api(sql)

# Telleverk
lock = threading.Lock()
stat = {"sjekket": 0, "med_regnskap": 0, "rader": 0, "feil": 0}

def fetch(orgnr):
    """-> liste av regnskap-dicts (tom hvis 404/ingen)."""
    for attempt in range(4):
        p = subprocess.run(["curl","-s","-m","60","-o","-","-w","\n%{http_code}",
            RKURL+orgnr,"-H","User-Agent: brreg-hop-seed","-H","Accept: application/json"],
            capture_output=True, text=True)
        body, _, code = p.stdout.rpartition("\n")
        if code == "200":
            try:
                data = json.loads(body)
            except ValueError:
                return []
            return [rec(x) for x in data] if isinstance(data, list) else []
        if code in ("404","204"):
            return []
        time.sleep(2*(attempt+1))  # 429/5xx/timeout -> backoff
    with lock: stat["feil"] += 1
    return []

def main():
    inn = ",".join(f"'{f.strip()}'" for f in FORMER)
    print(f"Henter org.numre ({'/'.join(FORMER)}) som mangler regnskap ...", flush=True)
    rows = api(f"select organisasjonsnummer from brreg.enheter "
               f"where organisasjonsform_kode in ({inn}) "
               f"and not exists (select 1 from brreg.regnskap r "
               f"where r.organisasjonsnummer = brreg.enheter.organisasjonsnummer)")
    orgnumre = [r["organisasjonsnummer"] for r in rows]
    print(f"{len(orgnumre)} org.numre å sjekke. Starter med {WORKERS} parallelle.", flush=True)
    t0 = time.time()
    buf = []
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for recs in ex.map(fetch, orgnumre):
            with lock:
                stat["sjekket"] += 1
                if recs:
                    stat["med_regnskap"] += 1
                    buf.extend(recs)
                s = stat["sjekket"]
            if len(buf) >= 500:
                upsert(buf);
                with lock: stat["rader"] += len(buf)
                buf = []
            if s % 5000 == 0:
                el = time.time()-t0
                print(f"  {s}/{len(orgnumre)} sjekket, {stat['med_regnskap']} m/regnskap, "
                      f"{stat['rader']+len(buf)} rader, {stat['feil']} feil, "
                      f"{s/el:.0f} org/s, ETA {(len(orgnumre)-s)/max(1,s/el)/60:.0f} min", flush=True)
    if buf:
        upsert(buf); stat["rader"] += len(buf)
    print(f"FERDIG: sjekket {stat['sjekket']}, {stat['med_regnskap']} m/regnskap, "
          f"{stat['rader']} rader lagret, {stat['feil']} varige feil, "
          f"{(time.time()-t0)/60:.0f} min", flush=True)

if __name__ == "__main__":
    main()
