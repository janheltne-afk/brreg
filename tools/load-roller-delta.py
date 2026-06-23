#!/usr/bin/env python3
"""Daglig delta-oppdatering av brreg.roller fra Enhetsregisterets endrings-feed.

Leser vannmerke (siste behandlede oppdaterings-id) fra brreg.sync_status, henter
nye rolle-endringer (`/oppdateringer/roller?afterId=...`), og for hvert endret
selskap: henter gjeldende roller og erstatter selskapets rader i brreg.roller.
Kjøres daglig via GitHub Actions (.github/workflows/roller-daglig.yml).

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-roller-delta.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
FEED = "https://data.brreg.no/enhetsregisteret/api/oppdateringer/roller"
ROLLER = "https://data.brreg.no/enhetsregisteret/api/enheter/{}/roller"
WM_KEY = "roller_oppdateringsid"
PAGE = 500
COLS = ("organisasjonsnummer,rollegruppe_kode,rolletype_kode,rolletype_beskrivelse,"
        "person_navn,person_fodselsdato,enhet_orgnr,enhet_navn,fratraadt,rekkefolge,sist_endret")


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


def http_json(url, retries=3):
    for attempt in range(retries):
        out = subprocess.run(["curl", "-s", "--max-time", "30", url,
                              "-H", "Accept: application/json"], capture_output=True, text=True).stdout
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            if attempt < retries - 1:
                time.sleep(2); continue
            return None


def t(s):
    return "NULL" if s in (None, "") else "'" + str(s).replace("'", "''") + "'"


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


def rows_for(org, data):
    for grp in data.get("rollegrupper", []) or []:
        gkode = (grp.get("type") or {}).get("kode")
        sist = grp.get("sistEndret")
        for rolle in grp.get("roller", []) or []:
            rt = rolle.get("type") or {}
            person = rolle.get("person") or {}
            enhet = rolle.get("enhet") or {}
            yield (org, gkode, rt.get("kode"), rt.get("beskrivelse"),
                   navn_str(person.get("navn")) if person else None,
                   person.get("fodselsdato") if person else None,
                   enhet.get("organisasjonsnummer") if enhet else None,
                   navn_str(enhet.get("navn")) if enhet else None,
                   rolle.get("fratraadt", rolle.get("avregistrert")),
                   rolle.get("rekkefolge"), sist)


def oppdater_selskap(org):
    data = http_json(ROLLER.format(org))
    if data is None:
        return
    rows = list(rows_for(org, data))
    sql = f"delete from brreg.roller where organisasjonsnummer = '{org}';"
    if rows:
        vals = ",".join(
            "(" + ",".join([t(o), t(gk), t(rk), t(rb), t(pn), dte(pf), t(eo), t(en), b(fr), n(rek), dte(se)]) + ")"
            for o, gk, rk, rb, pn, pf, eo, en, fr, rek, se in rows)
        sql += f" insert into brreg.roller ({COLS}) values {vals};"
        # Sørg for at nye personer med verv dukker opp i navnesøket (brreg.sok_navn).
        personer = {(pn, pf) for o, gk, rk, rb, pn, pf, eo, en, fr, rek, se in rows if pn and pf}
        pvals = ",".join(
            f"(upper({t(navn)}), to_char({dte(f)}, 'YYYY'), false, true)" for navn, f in personer)
        if pvals:
            sql += (" insert into brreg.sok_navn (navn, fodselsaar, er_aksjonaer, har_rolle) "
                    f"values {pvals} on conflict (navn, fodselsaar) do update set har_rolle = true;")
    run_sql(sql)


def main():
    wm = run_sql(f"select verdi from brreg.sync_status where nokkel = '{WM_KEY}'")
    after = int(wm[0]["verdi"]) if wm and wm[0]["verdi"] else 0
    print(f"Starter fra oppdaterings-id {after}")
    behandlet, maks = 0, after
    while True:
        events = http_json(f"{FEED}?afterId={after}&size={PAGE}")
        if not events:
            break
        orgs = []
        for e in events:
            maks = max(maks, int(e["id"]))
            org = (e.get("data") or {}).get("organisasjonsnummer")
            if org and org not in orgs:
                orgs.append(org)
        for org in orgs:
            oppdater_selskap(org)
            behandlet += 1
        run_sql(
            f"insert into brreg.sync_status (nokkel, verdi, sist_kjoert) values ('{WM_KEY}', '{maks}', now()) "
            f"on conflict (nokkel) do update set verdi = excluded.verdi, sist_kjoert = now()")
        print(f"  id {after} -> {maks}, {behandlet} selskap oppdatert")
        if len(events) < PAGE:
            break
        after = maks
    print(f"\nFerdig: {behandlet} selskap oppdatert, vannmerke = {maks}.")


if __name__ == "__main__":
    main()
