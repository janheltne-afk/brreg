#!/usr/bin/env python3
"""Hent registrerte kjøretøy etter drivstofftype og region/kommune (SSB tabell
07849, åpne data) -> brreg.kjoretoy_drivstoff. Summerer over "type kjøring".

Gir både drivstoff-fordeling (el/bensin/diesel/…) og tall per kommune.
Ingen eierinformasjon.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-kjoretoy-drivstoff.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
SSB = "https://data.ssb.no/api/v0/no/table/07849"


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


def meta():
    d = json.loads(subprocess.run(["curl", "-s", "--max-time", "30", SSB],
                                  capture_output=True, text=True).stdout)
    kjoring, grupper, aar = None, None, None
    for v in d["variables"]:
        if v["code"] == "KjoringensArt": kjoring = v["values"]
        if v["code"] == "ContentsCode": grupper = v["values"]
        if v["code"] == "Tid": aar = v["values"]
    return kjoring, grupper, aar[-1]


def hent(kjoring_kode, grupper, aar):
    q = {"query": [
        {"code": "Region", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "KjoringensArt", "selection": {"filter": "item", "values": [kjoring_kode]}},
        {"code": "DrivstoffType", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": grupper}},
        {"code": "Tid", "selection": {"filter": "item", "values": [aar]}},
    ], "response": {"format": "json-stat2"}}
    out = subprocess.run(["curl", "-s", "--max-time", "90", "-X", "POST", SSB,
                          "-H", "Content-Type: application/json", "--data", json.dumps(q)],
                         capture_output=True, text=True).stdout
    return json.loads(out)


def celler(d):
    dims = d["id"]; sizes = d["size"]; vals = d["value"]
    cats = {dim: d["dimension"][dim]["category"] for dim in dims}
    pos2code = {dim: {p: c for c, p in cats[dim]["index"].items()} for dim in dims}
    labels = {dim: cats[dim]["label"] for dim in dims}
    strides = [1] * len(sizes)
    for i in range(len(sizes) - 2, -1, -1):
        strides[i] = strides[i + 1] * sizes[i + 1]
    for i, v in enumerate(vals):
        if not v:
            continue
        rem = i; coord = {}
        for j, dim in enumerate(dims):
            p = rem // strides[j]; rem %= strides[j]; coord[dim] = pos2code[dim][p]
        yield (coord["Region"], labels["Region"][coord["Region"]],
               labels["ContentsCode"][coord["ContentsCode"]],
               labels["DrivstoffType"][coord["DrivstoffType"]],
               int(coord["Tid"]), int(v))


def t(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    run_sql("""
        create table if not exists brreg.kjoretoy_drivstoff (
          region_kode text, region text, gruppe text, drivstoff text, aar int, antall bigint,
          primary key (region_kode, gruppe, drivstoff, aar)
        )""")
    kjoring, grupper, aar = meta()
    print(f"Henter 07849 for år {aar}, summerer over {len(kjoring)} typer kjøring…")
    agg = {}
    meta_region = {}
    for k in kjoring:
        d = hent(k, grupper, aar)
        for rk, rn, gr, dr, yr, v in celler(d):
            meta_region[rk] = rn
            key = (rk, gr, dr, yr)
            agg[key] = agg.get(key, 0) + v
        print(f"  kjøring {k}: {len(agg)} kombinasjoner så langt")
    rows = [(rk, meta_region[rk], gr, dr, yr, n) for (rk, gr, dr, yr), n in agg.items()]
    print(f"{len(rows)} rader. Laster…")
    run_sql("truncate brreg.kjoretoy_drivstoff")
    for i in range(0, len(rows), 1000):
        b = rows[i:i + 1000]
        vals = ",".join(f"({t(rk)},{t(rn)},{t(gr)},{t(dr)},{yr},{n})" for rk, rn, gr, dr, yr, n in b)
        run_sql(f"insert into brreg.kjoretoy_drivstoff (region_kode,region,gruppe,drivstoff,aar,antall) values {vals}")
    tot = run_sql("select count(*) n, count(distinct region_kode) r from brreg.kjoretoy_drivstoff")
    print(f"Ferdig: {tot[0]['n']} rader, {tot[0]['r']} regioner.")


if __name__ == "__main__":
    main()
