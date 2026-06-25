#!/usr/bin/env python3
"""Last kjøretøy etter merke PER REGION/kommune (SSB 07832) -> brreg.kjoretoy_merke.
Gjør at merke-fordelingen kan vises per kommune, ikke bare nasjonalt.

Henter per kjøretøygruppe, i bolker av regioner (SSB-grense på 300k celler).
Nyeste år. Ingen eierinformasjon.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-kjoretoy-merke-region.py
"""
import os, json, time, subprocess

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
SSB = "https://data.ssb.no/api/v0/no/table/07832"
BOLK = 90  # regioner per kall (90 * 2569 makes < 300k celler)


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
    reg = next(v for v in d["variables"] if v["text"] == "region")
    grupper = next(v["values"] for v in d["variables"] if v["code"] == "ContentsCode")
    aar = next(v["values"][-1] for v in d["variables"] if v["code"] == "Tid")
    return reg["code"], reg["values"], grupper, aar


def hent(regdim, regioner, gruppe, aar):
    q = {"query": [
        {"code": regdim, "selection": {"filter": "item", "values": regioner}},
        {"code": "Kjoretoy", "selection": {"filter": "all", "values": ["*"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": [gruppe]}},
        {"code": "Tid", "selection": {"filter": "item", "values": [aar]}},
    ], "response": {"format": "json-stat2"}}
    out = subprocess.run(["curl", "-s", "--max-time", "120", "-X", "POST", SSB,
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
        yield coord, labels, v


def t(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    regdim, regioner, grupper, aar = meta()
    print(f"07832 per region: {len(regioner)} regioner, {len(grupper)} grupper, år {aar}")
    run_sql("""create table if not exists brreg.kjoretoy_merke (
                 region_kode text, region text, merke text, gruppe text, aar int, antall bigint,
                 primary key (region_kode, merke, gruppe, aar))""")
    run_sql("truncate brreg.kjoretoy_merke")
    grdim = "Kjoretoy"; ccdim = "ContentsCode"
    total = 0
    for gi, gruppe in enumerate(grupper, 1):
        buf = []
        for i in range(0, len(regioner), BOLK):
            d = hent(regdim, regioner[i:i + BOLK], gruppe, aar)
            for coord, labels, v in celler(d):
                buf.append((coord[regdim], labels[regdim][coord[regdim]],
                            labels[grdim][coord[grdim]], labels[ccdim][coord[ccdim]], int(v)))
            # tøm bufferen jevnlig
            if len(buf) >= 4000:
                ins(buf, aar); total += len(buf); buf = []
        if buf:
            ins(buf, aar); total += len(buf); buf = []
        print(f"  [{gi}/{len(grupper)}] {grupper[gi-1]} ferdig ({total} rader totalt)")
    res = run_sql("select count(*) n, count(distinct region_kode) r, count(distinct merke) m from brreg.kjoretoy_merke")
    print(f"Ferdig: {res[0]['n']} rader, {res[0]['r']} regioner, {res[0]['m']} merker.")


def ins(buf, aar):
    for i in range(0, len(buf), 1000):
        b = buf[i:i + 1000]
        vals = ",".join(f"({t(rk)},{t(rn)},{t(mk)},{t(gr)},{aar},{n})" for rk, rn, mk, gr, n in b)
        run_sql(f"insert into brreg.kjoretoy_merke (region_kode,region,merke,gruppe,aar,antall) values {vals} "
                "on conflict (region_kode,merke,gruppe,aar) do nothing")


if __name__ == "__main__":
    main()
