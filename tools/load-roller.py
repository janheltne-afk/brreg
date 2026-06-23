#!/usr/bin/env python3
"""Last roller (styre, daglig leder m.m.) for alle enheter -> brreg.roller.

Laster ned totalbestand (gzippet JSON-array) fra Enhetsregisteret, streamer
gjennom den med ijson, og batch-inserter via Supabase Management API.
Full-replace: tømmer brreg.roller først.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-roller.py [sti-til-gz]
"""
import os, sys, gzip, json, time, subprocess
import ijson

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
URL = "https://data.brreg.no/enhetsregisteret/api/roller/totalbestand"
ACCEPT = "application/vnd.brreg.enhetsregisteret.rolle.v1+gzip"
GZ = sys.argv[1] if len(sys.argv) > 1 else "/tmp/roller_totalbestand.json.gz"
BATCH = 5000


def run_sql(query, retries=4):
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = subprocess.run(
            ["curl", "-sS", "-m", "120", "-X", "POST", QURL,
             "-H", f"Authorization: Bearer {TOK}",
             "-H", "Content-Type: application/json", "--data", "@-"],
            input=body, capture_output=True, text=True).stdout
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


def t(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def dte(s):
    return t(s) + "::date" if s else "NULL"


def b(v):
    return "true" if v else ("false" if v is not None else "NULL")


def n(v):
    return str(int(v)) if isinstance(v, (int, float)) else "NULL"


def navn_str(navn):
    if isinstance(navn, dict):
        return " ".join(x for x in [navn.get("fornavn"), navn.get("mellomnavn"), navn.get("etternavn")] if x)
    if isinstance(navn, list):
        return " ".join(str(x) for x in navn if x)
    return navn if isinstance(navn, str) else None


def rows_for(ent):
    org = ent.get("organisasjonsnummer")
    for grp in ent.get("rollegrupper", []) or []:
        gkode = (grp.get("type") or {}).get("kode")
        sist = grp.get("sistEndret")
        for rolle in grp.get("roller", []) or []:
            rt = rolle.get("type") or {}
            person = rolle.get("person") or {}
            enhet = rolle.get("enhet") or {}
            pnavn = navn_str(person.get("navn")) if person else None
            yield (org, gkode, rt.get("kode"), rt.get("beskrivelse"),
                   pnavn, person.get("fodselsdato") if person else None,
                   enhet.get("organisasjonsnummer") if enhet else None,
                   navn_str(enhet.get("navn")) if enhet else None,
                   rolle.get("fratraadt", rolle.get("avregistrert")),
                   rolle.get("rekkefolge"), sist)


COLS = ("organisasjonsnummer,rollegruppe_kode,rolletype_kode,rolletype_beskrivelse,"
        "person_navn,person_fodselsdato,enhet_orgnr,enhet_navn,fratraadt,rekkefolge,sist_endret")


def flush(rows):
    vals = ",".join(
        "(" + ",".join([t(o), t(gk), t(rk), t(rb), t(pn), dte(pf), t(eo), t(en), b(fr), n(rek), dte(se)]) + ")"
        for o, gk, rk, rb, pn, pf, eo, en, fr, rek, se in rows)
    run_sql(f"insert into brreg.roller ({COLS}) values " + vals)


def download():
    if os.path.exists(GZ) and os.path.getsize(GZ) > 100_000_000:
        print(f"Bruker eksisterende {GZ}")
        return
    print("Laster ned totalbestand…")
    subprocess.run(["curl", "-s", "--max-time", "300", URL, "-H", f"Accept: {ACCEPT}", "-o", GZ], check=True)
    print(f"Lastet ned {os.path.getsize(GZ)//1_000_000} MB")


def main():
    download()
    print("Tømmer brreg.roller og laster…")
    run_sql("truncate brreg.roller;")
    batch, total = [], 0
    with gzip.open(GZ, "rb") as f:
        for ent in ijson.items(f, "item"):
            for row in rows_for(ent):
                batch.append(row)
                if len(batch) >= BATCH:
                    flush(batch); total += len(batch); batch = []
                    if total % 100000 == 0:
                        print(f"  {total} roller")
    if batch:
        flush(batch); total += len(batch)
    print(f"\nFerdig: {total} roller lastet.")


if __name__ == "__main__":
    main()
