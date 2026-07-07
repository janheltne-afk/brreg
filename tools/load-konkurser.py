#!/usr/bin/env python3
"""Hent alle enheter med konkurs=true fra brreg-API-et -> upsert brreg.enheter.

Løser to hull i konkursdataene:
  1. `konkursdato` er NULL for enheter lastet før kolonnen fantes (bulk-snapshot
     eldre enn skjemaendringen). Dette fyller inn datoen.
  2. Konkursåpnede selskaper som mangler helt i `enheter` (f.eks. åpnet etter
     siste seed, uten at delta-sync er kjørt) settes inn med full enhetsdata.

NB: brreg flagger kun *pågående* konkursbo (typisk ~3-4000). Ferdigbehandlede
bo slettes fra Enhetsregisteret og kan ikke hentes denne veien — historisk
konkursstatistikk kommer i stedet fra SSB (tools/load-ssb-naring.py ->
brreg.ssb_konkurser). Kjør derfor begge.

Idempotent — kjør gjerne ukentlig/månedlig.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-konkurser.py
"""
import os, json, time, subprocess, urllib.request

REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
API = "https://data.brreg.no/enhetsregisteret/api/enheter"
SIDE_STR = 500  # brreg tillater maks 10 000 treff totalt; konkurs=true er ~3-4k

COLS = [
    ("organisasjonsnummer","text"),("navn","text"),
    ("organisasjonsform_kode","text"),("organisasjonsform_beskrivelse","text"),
    ("naeringskode1","text"),("naeringskode1_beskrivelse","text"),
    ("naeringskode2","text"),("naeringskode2_beskrivelse","text"),
    ("antall_ansatte","int"),("stiftelsesdato","date"),("registreringsdato","date"),
    ("hjemmeside","text"),("epostadresse","text"),
    ("forr_adresse","text"),("forr_postnummer","text"),("forr_poststed","text"),
    ("forr_kommune","text"),("forr_kommunenummer","text"),("forr_land","text"),
    ("post_adresse","text"),("post_postnummer","text"),("post_poststed","text"),
    ("registrert_mva","boolean"),("registrert_foretaksreg","boolean"),
    ("konkurs","boolean"),("konkursdato","date"),("under_avvikling","boolean"),
    ("overordnet_enhet","text"),
    ("institusjonell_sektor_kode","text"),("institusjonell_sektor_beskrivelse","text"),
    ("slettedato","date"),
]
COLNAMES = [c for c, _ in COLS]
RECORDSET = ", ".join(f"{c} {t}" for c, t in COLS)
UPDATE_SET = ", ".join(f"{c}=excluded.{c}" for c in COLNAMES if c != "organisasjonsnummer")


def run_sql(query, retries=4):
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = subprocess.run(
            ["curl", "-sS", "-m", "120", "-X", "POST", QURL,
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


def hent_side(page):
    url = f"{API}?konkurs=true&size={SIDE_STR}&page={page}"
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def d(x):
    return x or None


def adr(o):
    a = (o or {}).get("adresse") or []
    return a[0] if a else None


def rec(e):
    of = e.get("organisasjonsform") or {}
    n1 = e.get("naeringskode1") or {}
    n2 = e.get("naeringskode2") or {}
    fa = e.get("forretningsadresse") or {}
    pa = e.get("postadresse") or {}
    isk = e.get("institusjonellSektorkode") or {}
    return {
        "organisasjonsnummer": e.get("organisasjonsnummer"),
        "navn": e.get("navn"),
        "organisasjonsform_kode": of.get("kode"),
        "organisasjonsform_beskrivelse": of.get("beskrivelse"),
        "naeringskode1": n1.get("kode"),
        "naeringskode1_beskrivelse": n1.get("beskrivelse"),
        "naeringskode2": n2.get("kode"),
        "naeringskode2_beskrivelse": n2.get("beskrivelse"),
        "antall_ansatte": e.get("antallAnsatte"),
        "stiftelsesdato": d(e.get("stiftelsesdato")),
        "registreringsdato": d(e.get("registreringsdatoEnhetsregisteret")),
        "hjemmeside": e.get("hjemmeside"),
        "epostadresse": e.get("epostadresse"),
        "forr_adresse": adr(fa), "forr_postnummer": fa.get("postnummer"),
        "forr_poststed": fa.get("poststed"), "forr_kommune": fa.get("kommune"),
        "forr_kommunenummer": fa.get("kommunenummer"), "forr_land": fa.get("land"),
        "post_adresse": adr(pa), "post_postnummer": pa.get("postnummer"),
        "post_poststed": pa.get("poststed"),
        "registrert_mva": e.get("registrertIMvaregisteret"),
        "registrert_foretaksreg": e.get("registrertIForetaksregisteret"),
        "konkurs": e.get("konkurs"), "konkursdato": d(e.get("konkursdato")),
        "under_avvikling": e.get("underAvvikling"),
        "overordnet_enhet": e.get("overordnetEnhet"),
        "institusjonell_sektor_kode": isk.get("kode"),
        "institusjonell_sektor_beskrivelse": isk.get("beskrivelse"),
        "slettedato": d(e.get("slettedato")),
    }


def flush(batch):
    arr = json.dumps([{k: r[k] for k in COLNAMES} for r in batch], ensure_ascii=False)
    sql = (f"INSERT INTO brreg.enheter ({', '.join(COLNAMES)}) "
           f"SELECT {', '.join(COLNAMES)} FROM jsonb_to_recordset($j${arr}$j$::jsonb) "
           f"AS x({RECORDSET}) ON CONFLICT (organisasjonsnummer) DO UPDATE SET {UPDATE_SET};")
    run_sql(sql)


def main():
    page, totalt = 0, None
    lastet = 0
    while True:
        data = hent_side(page)
        if totalt is None:
            totalt = data.get("page", {}).get("totalElements", 0)
            print(f"{totalt} enheter med konkurs=true i brreg.")
        enheter = data.get("_embedded", {}).get("enheter", [])
        if not enheter:
            break
        flush([rec(e) for e in enheter])
        lastet += len(enheter)
        print(f"  {lastet}/{totalt}", flush=True)
        if page >= data.get("page", {}).get("totalPages", 1) - 1:
            break
        page += 1

    print(f"\nFerdig: {lastet} konkursenheter upsertet til brreg.enheter.")
    print("Tips: kjør også tools/load-ssb-naring.py for offisiell historisk "
          "konkursstatistikk (brreg.ssb_konkurser).")


if __name__ == "__main__":
    main()
