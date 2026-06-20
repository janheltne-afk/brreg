#!/usr/bin/env python3
"""Strøm brreg bulk-gz -> upsert til Supabase `brreg.enheter` via Management API.

Brukes til **førstegangslast (seeding)** i miljøer der Postgres-porten (5432) er
stengt og bare HTTPS slipper ut – da kan ikke Hop/psql brukes direkte. Skriptet
laster i stedet hele registeret rett inn via Supabase Management API over 443.

Felt-mappingen følger `db/schema.sql` (samme som Hop-pipelinen `brreg-bulk-last`).
Adresser tar første adresselinje (`adresse[0]`). `oppdateringsid`/`sist_oppdatert`
finnes ikke i bulk-snapshotet og settes NULL.

Forutsetter at hele registeret er lastet ned som gzip JSON-array, f.eks. via
`tools/seed-prep.py` (som også gir deg SEED_WATERMARK å sette i sync_status).

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...      # personlig access token
  export SUPABASE_PROJECT_REF=<prosjekt-ref>
  python3 tools/load-enheter.py enheter_alle.json.gz [batch_size]

Etterpå: sett watermark slik at delta-syncen fortsetter riktig:
  tools/run-sql.sh "update brreg.sync_status set verdi='<SEED_WATERMARK>',
                    sist_kjoert=now() where nokkel='enheter_oppdateringsid';"
"""
import sys, os, gzip, io, json, subprocess, time

GZ = sys.argv[1]
BATCH = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"

COLS = [
    ("organisasjonsnummer","text"),("navn","text"),
    ("organisasjonsform_kode","text"),("organisasjonsform_beskrivelse","text"),
    ("naeringskode1","text"),("naeringskode1_beskrivelse","text"),
    ("naeringskode2","text"),("naeringskode2_beskrivelse","text"),
    ("antall_ansatte","int"),("stiftelsesdato","date"),("registreringsdato","date"),
    ("hjemmeside","text"),("epostadresse","text"),
    ("forr_adresse","text"),("forr_postnummer","text"),("forr_poststed","text"),
    ("forr_kommune","text"),("forr_kommunenummer","text"),("forr_land","text"),
    ("post_adresse","text"),("post_postnummer","text"),("post_poststed","text"),
    ("registrert_mva","boolean"),("registrert_foretaksreg","boolean"),
    ("konkurs","boolean"),("under_avvikling","boolean"),("overordnet_enhet","text"),
    ("institusjonell_sektor_kode","text"),("institusjonell_sektor_beskrivelse","text"),
    ("slettedato","date"),
]
COLNAMES = [c for c,_ in COLS]
RECORDSET = ", ".join(f"{c} {t}" for c,t in COLS)
UPDATE_SET = ", ".join(f"{c}=excluded.{c}" for c in COLNAMES if c != "organisasjonsnummer")

def d(x):
    return x or None
def adr(o):
    a = (o or {}).get("adresse") or []
    return a[0] if a else None

def rec(e):
    of = e.get("organisasjonsform") or {}
    n1 = e.get("naeringskode1") or {}
    n2 = e.get("naeringskode2") or {}
    fa = e.get("forretningsadresse") or {}
    pa = e.get("postadresse") or {}
    isk = e.get("institusjonellSektorkode") or {}
    return {
        "organisasjonsnummer": e.get("organisasjonsnummer"),
        "navn": e.get("navn"),
        "organisasjonsform_kode": of.get("kode"),
        "organisasjonsform_beskrivelse": of.get("beskrivelse"),
        "naeringskode1": n1.get("kode"),
        "naeringskode1_beskrivelse": n1.get("beskrivelse"),
        "naeringskode2": n2.get("kode"),
        "naeringskode2_beskrivelse": n2.get("beskrivelse"),
        "antall_ansatte": e.get("antallAnsatte"),
        "stiftelsesdato": d(e.get("stiftelsesdato")),
        "registreringsdato": d(e.get("registreringsdatoEnhetsregisteret")),
        "hjemmeside": e.get("hjemmeside"),
        "epostadresse": e.get("epostadresse"),
        "forr_adresse": adr(fa), "forr_postnummer": fa.get("postnummer"),
        "forr_poststed": fa.get("poststed"), "forr_kommune": fa.get("kommune"),
        "forr_kommunenummer": fa.get("kommunenummer"), "forr_land": fa.get("land"),
        "post_adresse": adr(pa), "post_postnummer": pa.get("postnummer"),
        "post_poststed": pa.get("poststed"),
        "registrert_mva": e.get("registrertIMvaregisteret"),
        "registrert_foretaksreg": e.get("registrertIForetaksregisteret"),
        "konkurs": e.get("konkurs"), "under_avvikling": e.get("underAvvikling"),
        "overordnet_enhet": e.get("overordnetEnhet"),
        "institusjonell_sektor_kode": isk.get("kode"),
        "institusjonell_sektor_beskrivelse": isk.get("beskrivelse"),
        "slettedato": d(e.get("slettedato")),
    }

def flush(batch):
    arr = json.dumps([{k: r[k] for k in COLNAMES} for r in batch], ensure_ascii=False)
    sql = (f"INSERT INTO brreg.enheter ({', '.join(COLNAMES)}) "
           f"SELECT {', '.join(COLNAMES)} FROM jsonb_to_recordset($j${arr}$j$::jsonb) "
           f"AS x({RECORDSET}) ON CONFLICT (organisasjonsnummer) DO UPDATE SET {UPDATE_SET};")
    body = json.dumps({"query": sql})
    for attempt in range(5):
        p = subprocess.run(["curl","-sS","-m","120","-X","POST",URL,
            "-H",f"Authorization: Bearer {TOK}","-H","Content-Type: application/json",
            "--data-binary","@-"], input=body, capture_output=True, text=True)
        out = p.stdout.strip()
        if out == "[]":
            return
        if '"message"' in out or p.returncode != 0:
            print(f"  retry {attempt+1}: {out[:200]}", flush=True)
            time.sleep(3*(attempt+1)); continue
        print(f"  uventet svar: {out[:200]}", flush=True); return
    raise SystemExit("Batch feilet etter 5 forsøk")

def main():
    dec = json.JSONDecoder()
    fin = io.TextIOWrapper(gzip.open(GZ,"rb"), encoding="utf-8")
    buf, started, n, batch = "", False, 0, []
    t0 = time.time()
    while True:
        data = fin.read(1<<20)
        if data: buf += data
        while True:
            buf = buf.lstrip()
            if not buf: break
            if buf[0]=="[" and not started: buf, started = buf[1:], True; continue
            if buf[0]==",": buf = buf[1:]; continue
            if buf[0]=="]":
                if batch: flush(batch)
                print(f"FERDIG: {n} enheter på {time.time()-t0:.0f}s"); return
            try: obj, idx = dec.raw_decode(buf)
            except ValueError: break
            batch.append(rec(obj)); n += 1; buf = buf[idx:]
            if len(batch) >= BATCH:
                flush(batch); batch = []
                if n % 50000 == 0:
                    print(f"  {n} lastet ({n/(time.time()-t0):.0f}/s)", flush=True)
        if not data:
            if batch: flush(batch)
            print(f"FERDIG (EOF): {n} enheter på {time.time()-t0:.0f}s"); return

if __name__ == "__main__":
    main()
