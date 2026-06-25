#!/usr/bin/env python3
"""Importer to SSB-datasett om næringslivet (åpne data), per region og år:
  - brreg.ssb_konkurser  : åpnede konkurser (tabell 07164, kvartal -> år)
  - brreg.ssb_nyetablerte: nyetablerte foretak (tabell 08316)

Aggregert, ingen persondata. Komplementerer selskaps-/investeringsdataene.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-ssb-naring.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
BASE = "https://data.ssb.no/api/v0/no/table/"


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


def ssb(table, query):
    out = subprocess.run(["curl", "-s", "--max-time", "120", "-X", "POST", BASE + table,
                          "-H", "Content-Type: application/json",
                          "--data", json.dumps({"query": query, "response": {"format": "json-stat2"}})],
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
        if v is None:
            continue
        rem = i; coord = {}
        for j, dim in enumerate(dims):
            p = rem // strides[j]; rem %= strides[j]; coord[dim] = pos2code[dim][p]
        yield coord, labels, v


def t(s):
    return "'" + str(s).replace("'", "''") + "'"


def insert(tabell, kolonner, rows):
    for i in range(0, len(rows), 500):
        b = rows[i:i + 500]
        vals = ",".join("(" + ",".join(c) + ")" for c in b)
        run_sql(f"insert into {tabell} ({kolonner}) values {vals}")


def konkurser():
    print("Konkurser (07164)…")
    d = ssb("07164", [
        {"code": "Region", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "Etableringsaar", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "NACE2007", "selection": {"filter": "item", "values": ["01-99"]}},
        {"code": "Omset", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "OrgFormer", "selection": {"filter": "item", "values": ["99"]}},
        {"code": "SysselsettGr", "selection": {"filter": "item", "values": ["999"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Konkurser"]}},
        {"code": "Tid", "selection": {"filter": "all", "values": ["*"]}},
    ])
    agg = {}; kvartaler = {}; navn = {}
    for coord, labels, v in celler(d):
        rk = coord["Region"]; navn[rk] = labels["Region"][rk]
        aar = int(coord["Tid"][:4])
        agg[(rk, aar)] = agg.get((rk, aar), 0) + int(v)
        kvartaler[(rk, aar)] = kvartaler.get((rk, aar), 0) + 1
    run_sql("""create table if not exists brreg.ssb_konkurser (
                 region_kode text, region text, aar int, konkurser bigint,
                 primary key (region_kode, aar))""")
    run_sql("truncate brreg.ssb_konkurser")
    rows = [[t(rk), t(navn[rk]), str(aar), str(n)]
            for (rk, aar), n in agg.items() if kvartaler[(rk, aar)] == 4]  # kun komplette år
    insert("brreg.ssb_konkurser", "region_kode,region,aar,konkurser", rows)
    print(f"  {len(rows)} rader (region×år).")


def nyetablerte():
    print("Nyetablerte foretak (08316)…")
    d = ssb("08316", [
        {"code": "Region", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "NACE2007", "selection": {"filter": "item", "values": ["00-99"]}},
        {"code": "OrgFormer", "selection": {"filter": "item", "values": ["Alle"]}},
        {"code": "AntSyss", "selection": {"filter": "item", "values": ["999"]}},
        {"code": "OverlevAar", "selection": {"filter": "item", "values": ["01"]}},
        {"code": "Overlevelse", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Foretak"]}},
        {"code": "Tid", "selection": {"filter": "all", "values": ["*"]}},
    ])
    navn = {}; rows = []
    for coord, labels, v in celler(d):
        rk = coord["Region"]; navn[rk] = labels["Region"][rk]
        rows.append([t(rk), t(labels["Region"][rk]), coord["Tid"], str(int(v))])
    run_sql("""create table if not exists brreg.ssb_nyetablerte (
                 region_kode text, region text, aar int, foretak bigint,
                 primary key (region_kode, aar))""")
    run_sql("truncate brreg.ssb_nyetablerte")
    insert("brreg.ssb_nyetablerte", "region_kode,region,aar,foretak", rows)
    print(f"  {len(rows)} rader (region×år).")


if __name__ == "__main__":
    konkurser()
    nyetablerte()
    print("Ferdig.")
