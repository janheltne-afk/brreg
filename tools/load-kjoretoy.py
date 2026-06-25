#!/usr/bin/env python3
"""Hent registrerte kjøretøy i Norge etter merke (SSB tabell 07832, åpne data)
og last inn i brreg.kjoretoy_bestand. Nasjonale tall, alle kjøretøygrupper
(personbiler, varebiler, lastebiler, busser, MC, …), nyeste tilgjengelige år.

Ingen eierinformasjon (det er ikke åpne data) – kun antall per merke.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...
  export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-kjoretoy.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
SSB = "https://data.ssb.no/api/v0/no/table/07832"


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


def ssb_meta():
    out = subprocess.run(["curl", "-s", "--max-time", "30", SSB], capture_output=True, text=True).stdout
    d = json.loads(out)
    grupper, aar = None, None
    for v in d["variables"]:
        if v["code"] == "ContentsCode":
            grupper = v["values"]
        if v["code"] == "Tid":
            aar = v["values"]
    return grupper, aar[-2:]  # to nyeste år


def ssb_data(grupper, aar):
    q = {"query": [
        {"code": "Region", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "Kjoretoy", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": grupper}},
        {"code": "Tid", "selection": {"filter": "item", "values": aar}},
    ], "response": {"format": "json-stat2"}}
    out = subprocess.run(["curl", "-s", "--max-time", "60", "-X", "POST", SSB,
                          "-H", "Content-Type: application/json", "--data", json.dumps(q)],
                         capture_output=True, text=True).stdout
    return json.loads(out)


def rader(d):
    dims = d["id"]; sizes = d["size"]; vals = d["value"]
    cats = {dim: d["dimension"][dim]["category"] for dim in dims}
    # invers indeks: posisjon -> kode, og kode -> label
    pos2code = {}
    for dim in dims:
        idx = cats[dim]["index"]
        pos2code[dim] = {p: c for c, p in idx.items()}
    labels = {dim: cats[dim]["label"] for dim in dims}
    # strides for row-major dekoding
    strides = [1] * len(sizes)
    for i in range(len(sizes) - 2, -1, -1):
        strides[i] = strides[i + 1] * sizes[i + 1]
    for i, v in enumerate(vals):
        if not v:
            continue
        coord = {}
        rem = i
        for j, dim in enumerate(dims):
            p = rem // strides[j]; rem = rem % strides[j]
            coord[dim] = pos2code[dim][p]
        merke = labels["Kjoretoy"][coord["Kjoretoy"]]
        gruppe = labels["ContentsCode"][coord["ContentsCode"]]
        aar = coord["Tid"]
        yield (merke, gruppe, int(aar), int(v))


def t(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    run_sql("""
        create table if not exists brreg.kjoretoy_bestand (
          merke text, gruppe text, aar int, antall bigint,
          primary key (merke, gruppe, aar)
        )""")
    grupper, aar = ssb_meta()
    print(f"Henter SSB 07832: {len(grupper)} kjøretøygrupper, år {aar}…")
    d = ssb_data(grupper, aar)
    rows = list(rader(d))
    print(f"{len(rows)} rader med data. Laster…")
    run_sql("truncate brreg.kjoretoy_bestand")
    for i in range(0, len(rows), 1000):
        b = rows[i:i + 1000]
        vals = ",".join(f"({t(m)},{t(g)},{a},{n})" for m, g, a, n in b)
        run_sql(f"insert into brreg.kjoretoy_bestand (merke,gruppe,aar,antall) values {vals}")
    tot = run_sql("select count(*) n, count(distinct merke) m, max(aar) y from brreg.kjoretoy_bestand")
    print(f"Ferdig: {tot[0]['n']} rader, {tot[0]['m']} merker, nyeste år {tot[0]['y']}.")


if __name__ == "__main__":
    main()
