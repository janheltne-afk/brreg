#!/usr/bin/env python3
"""Fyll brreg.sok_navn.sted med poststed/kommune per (navn, fødselsår), slik at
navnesøket kan vise hvor en aksjonær hører til – på samme måte som fødselsår.

Kilder, i prioritert rekkefølge (fyller bare der sted fortsatt er NULL):
  1. Skattelista (ekte kommune) – nyeste år.
  2. Aksjonærregisteret (poststed fra postnr_sted) – nyeste år først.

Per-år for å holde hver setning rask. Idempotent.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-sok-sted.py
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
    run_sql("alter table brreg.sok_navn add column if not exists sted text")

    # 1) Skattelista – ekte kommune, nyeste år per person.
    print("Fyller fra skattelista…")
    run_sql("""
        update brreg.sok_navn s set sted = sub.kommune
        from (
          select distinct on (navn_upper, fodselsaar) navn_upper, fodselsaar::text as fodselsaar, kommune
          from brreg.skatteliste
          where kommune is not null
          order by navn_upper, fodselsaar, aar desc
        ) sub
        where s.sted is null and s.navn = sub.navn_upper and s.fodselsaar = sub.fodselsaar
    """)

    # 2) Aksjonærregisteret – poststed (uten postnr), nyeste år først.
    for yr in range(2025, 2004, -1):
        print(f"Fyller fra aksjonærregisteret {yr}…")
        run_sql(f"""
            update brreg.sok_navn s set sted = sub.sted
            from (
              select distinct on (aksjonaer_navn, fodselsaar_orgnr)
                     aksjonaer_navn, fodselsaar_orgnr,
                     nullif(trim(regexp_replace(postnr_sted, '^[0-9]+\\s*', '')), '') as sted
              from brreg.aksjonaerer
              where aar = {yr} and postnr_sted ~ '[A-ZÆØÅa-zæøå]'
              order by aksjonaer_navn, fodselsaar_orgnr
            ) sub
            where s.sted is null and s.navn = sub.aksjonaer_navn
              and s.fodselsaar = sub.fodselsaar_orgnr and sub.sted is not null
        """)

    tot = run_sql("select count(*) n, count(sted) m from brreg.sok_navn")
    print(f"\nFerdig: {tot[0]['m']} av {tot[0]['n']} navn har sted.")


if __name__ == "__main__":
    main()
