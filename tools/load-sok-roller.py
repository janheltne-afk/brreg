#!/usr/bin/env python3
"""Legg personer med styreverv (brreg.roller) inn i søke-tabellen brreg.sok_navn,
slik at de dukker opp i navnesøket selv om de ikke er aksjonær eller på skattelista.

Setter har_rolle=true. Kjøres bøtte-for-bøtte (etter første tegn i navnet) for at
hver INSERT skal være rask nok for Management API-et. Idempotent (on conflict).

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-sok-roller.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"


def run_sql(query, retries=4, timeout=600):
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = subprocess.run(
            ["curl", "-sS", "-m", str(timeout), "-X", "POST", QURL,
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


def main():
    # Distinkte førstetegn i personnavn -> bøtter.
    chars = run_sql(
        "select distinct left(upper(person_navn),1) c from brreg.roller "
        "where person_navn is not null order by c")
    buckets = [r["c"] for r in chars if r["c"]]
    print(f"{len(buckets)} bøtter")
    for c in buckets:
        esc = c.replace("'", "''")
        run_sql(
            "insert into brreg.sok_navn (navn, fodselsaar, er_aksjonaer, har_rolle) "
            "select upper(person_navn), to_char(person_fodselsdato,'YYYY'), false, true "
            "from brreg.roller "
            "where person_navn is not null and person_fodselsdato is not null "
            f"and left(upper(person_navn),1) = '{esc}' "
            "group by upper(person_navn), to_char(person_fodselsdato,'YYYY') "
            "on conflict (navn, fodselsaar) do update set har_rolle = true")
        print(f"  bøtte '{c}' ferdig")
    tot = run_sql("select count(*) n, count(*) filter (where har_rolle) r from brreg.sok_navn")
    print(f"\nFerdig: {tot[0]['n']} navn i sok_navn, {tot[0]['r']} med styreverv.")


if __name__ == "__main__":
    main()
