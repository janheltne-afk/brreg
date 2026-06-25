#!/usr/bin/env python3
"""Seed forhåndsskrevne dypdykk-profiler inn i brreg.suksess_dypdykk, slik at
Suksesshistorier-fanen viser utfyllende profiler UTEN at det trengs en
AI-nøkkel (appen leser cache før den evt. genererer).

Tekstene er faktabaserte oppsummeringer fra offentlig kjent informasjon, med
tydelig merkede anslag/antakelser. Idempotent (on conflict oppdaterer).

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/seed-dypdykk.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"


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


def q(s):
    return "'" + s.replace("'", "''") + "'"


# navn -> profiltekst. Bygges ut i puljer; importeres fra dypdykk_tekster.py.
from dypdykk_tekster import PROFILER


def main():
    run_sql("create table if not exists brreg.suksess_dypdykk (navn text primary key, tekst text, generert timestamptz default now())")
    items = list(PROFILER.items())
    for i in range(0, len(items), 20):
        b = items[i:i + 20]
        vals = ",".join(f"({q(n)}, {q(t.strip())}, now())" for n, t in b)
        run_sql(f"insert into brreg.suksess_dypdykk (navn, tekst, generert) values {vals} "
                "on conflict (navn) do update set tekst = excluded.tekst, generert = now()")
    tot = run_sql("select count(*) n from brreg.suksess_dypdykk")
    print(f"Ferdig: {tot[0]['n']} dypdykk i databasen.")


if __name__ == "__main__":
    main()
