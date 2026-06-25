#!/usr/bin/env python3
"""Importer to SSB-datasett (åpne data) på kommune-/fylkesnivå:
  - brreg.ssb_befolkning      : folkemengde per kommune (tabell 11805)
  - brreg.ssb_eiendomsomsetning: omsetning + tinglyst beløp per fylke (03222)

Komplementerer de kommune-baserte funksjonene (per-innbygger-tall, eiendoms-
marked). Aggregert, ingen persondata.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-ssb-kommune.py
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


def meta(table):
    return json.loads(subprocess.run(["curl", "-s", "--max-time", "30", BASE + table],
                                     capture_output=True, text=True).stdout)


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


def befolkning():
    m = meta("11805")
    regdim = next(v["code"] for v in m["variables"] if v["text"] == "region")
    alderdim = next(v["code"] for v in m["variables"] if v["text"] == "alder")
    aar = next(v["values"][-1] for v in m["variables"] if v["code"] == "Tid")
    print(f"Folkemengde (11805), år {aar}…")
    d = ssb("11805", [
        {"code": regdim, "selection": {"filter": "all", "values": ["*"]}},
        {"code": alderdim, "selection": {"filter": "all", "values": ["*"]}},
        {"code": "Tid", "selection": {"filter": "item", "values": [aar]}},
    ])
    # alder-dimensjonen blander enkeltår OG kumulative grupper (0-2 år, 0-3 år …).
    # Summer bare enkeltår (tallkoder 000-104) + den øverste "105 år og over",
    # ellers dobbelttelles befolkningen.
    agg = {}; navn = {}
    for coord, labels, v in celler(d):
        ak = coord[alderdim]
        if not (ak.isdigit() or ak == "F105-120"):
            continue
        rk = coord[regdim]; navn[rk] = labels[regdim][rk]
        agg[rk] = agg.get(rk, 0) + int(v)
    run_sql("""create table if not exists brreg.ssb_befolkning (
                 region_kode text primary key, region text, aar int, folkemengde bigint)""")
    run_sql("truncate brreg.ssb_befolkning")
    rows = [(rk, navn[rk], int(aar), n) for rk, n in agg.items()]
    for i in range(0, len(rows), 500):
        b = rows[i:i+500]
        run_sql("insert into brreg.ssb_befolkning (region_kode,region,aar,folkemengde) values " +
                ",".join(f"({t(rk)},{t(rn)},{a},{n})" for rk, rn, a, n in b))
    print(f"  {len(rows)} kommuner lastet.")


def eiendom():
    m = meta("03222")
    finnes = set(next(v["values"] for v in m["variables"] if v["code"] == "Tid"))
    # nyeste KOMPLETTE kalenderår (alle fire kvartaler tilgjengelig)
    aar = max(y for y in {x[:4] for x in finnes}
              if all(f"{y}K{k}" in finnes for k in (1, 2, 3, 4)))
    kvartaler = [f"{aar}K{k}" for k in (1, 2, 3, 4)]
    print(f"Eiendomsomsetning (03222), år {aar} ({len(kvartaler)} kvartal)…")
    d = ssb("03222", [
        {"code": "Region", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "ContentsCode", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "Tid", "selection": {"filter": "item", "values": kvartaler}},
    ])
    agg = {}; navn = {}
    for coord, labels, v in celler(d):
        rk = coord["Region"]; navn[rk] = labels["Region"][rk]
        cc = coord["ContentsCode"]
        agg.setdefault(rk, {"Omsetninger": 0.0, "Tinglystbelop": 0.0})
        agg[rk][cc] = agg[rk].get(cc, 0.0) + float(v)
    run_sql("""create table if not exists brreg.ssb_eiendomsomsetning (
                 region_kode text primary key, region text, aar int,
                 omsetninger bigint, tinglyst_mill numeric)""")
    run_sql("truncate brreg.ssb_eiendomsomsetning")
    rows = [(rk, navn[rk], int(aar), int(a["Omsetninger"]), round(a["Tinglystbelop"], 1))
            for rk, a in agg.items()]
    run_sql("insert into brreg.ssb_eiendomsomsetning (region_kode,region,aar,omsetninger,tinglyst_mill) values " +
            ",".join(f"({t(rk)},{t(rn)},{a},{o},{tb})" for rk, rn, a, o, tb in rows))
    print(f"  {len(rows)} regioner lastet.")


if __name__ == "__main__":
    befolkning()
    eiendom()
    print("Ferdig.")
