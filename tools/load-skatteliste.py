#!/usr/bin/env python3
"""Last skatteliste-CSV -> brreg.skatteliste (knyttes til aksjonærer på navn+fødselsår).

CSV-kolonner: year,municipality_number,municipality_name,rank,name,first_name,
last_name,year_of_birth,income,wealth,tax

Lagrer navn_upper = UPPER(name) for kobling mot aksjonaerer.aksjonaer_navn.
Batch-upsert via Supabase Management API (curl, som de andre loaderne).

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-skatteliste.py <sti-til-csv> [batch]
"""
import os, sys, csv, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
PATH = sys.argv[1]
BATCH = int(sys.argv[2]) if len(sys.argv) > 2 else 3000


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


def t(s):  # tekst -> SQL-literal eller NULL
    if s is None or s == "":
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def n(s):  # tall -> SQL-literal eller NULL
    if s is None or s == "":
        return "NULL"
    try:
        return str(float(s)) if "." in s else str(int(s))
    except ValueError:
        return "NULL"


COLS = ("aar,kommunenr,kommune,rang,navn,navn_upper,fornavn,etternavn,"
        "fodselsaar,inntekt,formue,skatt")


def flush(rows, lastet):
    if not rows:
        return lastet
    vals = []
    for r in rows:
        navn = r.get("name") or ""
        vals.append(
            "(" + ",".join([
                n(r.get("year")), t(r.get("municipality_number")), t(r.get("municipality_name")),
                n(r.get("rank")), t(navn), t(navn.upper()),
                t(r.get("first_name")), t(r.get("last_name")), n(r.get("year_of_birth")),
                n(r.get("income")), n(r.get("wealth")), n(r.get("tax")),
            ]) + ")")
    run_sql(f"insert into brreg.skatteliste ({COLS}) values " + ",".join(vals))
    lastet += len(rows)
    print(f"  lastet {lastet}")
    return lastet


def main():
    lastet, batch = 0, []
    with open(PATH, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            batch.append(r)
            if len(batch) >= BATCH:
                lastet = flush(batch, lastet); batch = []
    lastet = flush(batch, lastet)
    print(f"\nFerdig: {lastet} rader lastet til brreg.skatteliste.")


if __name__ == "__main__":
    main()
