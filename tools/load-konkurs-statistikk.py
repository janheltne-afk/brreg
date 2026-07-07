#!/usr/bin/env python3
"""Offisiell konkursstatistikk fra SSB tabell 12972 (åpne data) -> Supabase.

Laster to aggregater (uker summeres til år):
  - brreg.ssb_konkurser_kommune : åpnede konkurser per KOMMUNE x år (2009->)
  - brreg.ssb_konkurser_naering : åpnede konkurser per NÆRING (2-siffer NACE
                                  + bokstavseksjoner) x år, hele landet

Dette er den komplette, offisielle statistikken — i motsetning til
brreg.enheter.konkurs som kun dekker *pågående* konkursbo (ferdigbehandlede
bo slettes fra Enhetsregisteret). Konkursmodulen i dashboardet bruker begge:
SSB for tall/trender, enheter for drillbar selskapsliste.

Inneværende år er med (delvis år - tydelig merket i UI).

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-konkurs-statistikk.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
TABELL = "https://data.ssb.no/api/v0/no/table/12972"


def run_sql(query, retries=4):
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = subprocess.run(
            ["curl", "-sS", "-m", "180", "-X", "POST", QURL,
             "-H", f"Authorization: Bearer {TOK}",
             "-H", "Content-Type: application/json", "--data-binary", "@-"],
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


def ssb(query):
    out = subprocess.run(["curl", "-s", "--max-time", "180", "-X", "POST", TABELL,
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


def kommune():
    print("Konkurser per kommune x år (12972)…")
    d = ssb([
        {"code": "Region", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "Naring", "selection": {"filter": "item", "values": ["00-99"]}},
        {"code": "Vekedag", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Konkursar"]}},
        {"code": "Tid", "selection": {"filter": "all", "values": ["*"]}},
    ])
    agg = {}; navn = {}
    for coord, labels, v in celler(d):
        rk = coord["Region"]; navn[rk] = labels["Region"][rk]
        aar = int(coord["Tid"][:4])
        agg[(rk, aar)] = agg.get((rk, aar), 0) + int(v)
    run_sql("""create table if not exists brreg.ssb_konkurser_kommune (
                 region_kode text, region text, aar int, konkurser bigint,
                 primary key (region_kode, aar))""")
    run_sql("truncate brreg.ssb_konkurser_kommune")
    # SSB-navn har form "Trondheim - Tråante"; behold hele, UI viser første del.
    rows = [[t(rk), t(navn[rk]), str(aar), str(n)] for (rk, aar), n in agg.items()]
    insert("brreg.ssb_konkurser_kommune", "region_kode,region,aar,konkurser", rows)
    print(f"  {len(rows)} rader (region x år).")


def naering():
    print("Konkurser per næring x år, hele landet (12972)…")
    d = ssb([
        {"code": "Region", "selection": {"filter": "item", "values": ["0N"]}},
        {"code": "Naring", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "Vekedag", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Konkursar"]}},
        {"code": "Tid", "selection": {"filter": "all", "values": ["*"]}},
    ])
    agg = {}; navn = {}
    for coord, labels, v in celler(d):
        nk = coord["Naring"]; navn[nk] = labels["Naring"][nk]
        aar = int(coord["Tid"][:4])
        agg[(nk, aar)] = agg.get((nk, aar), 0) + int(v)
    run_sql("""create table if not exists brreg.ssb_konkurser_naering (
                 naering_kode text, naering text, aar int, konkurser bigint,
                 primary key (naering_kode, aar))""")
    run_sql("truncate brreg.ssb_konkurser_naering")
    rows = [[t(nk), t(navn[nk]), str(aar), str(n)] for (nk, aar), n in agg.items()]
    insert("brreg.ssb_konkurser_naering", "naering_kode,naering,aar,konkurser", rows)
    print(f"  {len(rows)} rader (næring x år).")


if __name__ == "__main__":
    kommune()
    naering()
    print("Ferdig.")
