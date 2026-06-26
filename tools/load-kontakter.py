#!/usr/bin/env python3
"""Importer telefonkontakter (.vcf / vCard) til brreg.app_kontakt for en bruker.
Kobles mot personene i Aksjonær-fanen på navn. Personlige data – kun for egen
innlogget bruker.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/load-kontakter.py <sti-til-fil.vcf> [brukernavn]
"""
import os, sys, re, json, subprocess

VCF = sys.argv[1]
BRUKER = sys.argv[2] if len(sys.argv) > 2 else "admin"
REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
QURL = f"https://api.supabase.com/v1/projects/{REF}/database/query"


def run_sql(query, retries=4):
    body = json.dumps({"query": query})
    for attempt in range(retries):
        out = subprocess.run(["curl", "-sS", "-m", "120", "-X", "POST", QURL,
                              "-H", f"Authorization: Bearer {TOK}",
                              "-H", "Content-Type: application/json", "--data", "@-"],
                             input=body, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except json.JSONDecodeError:
            if attempt < retries - 1: continue
            raise RuntimeError(out[:200])
        if isinstance(d, dict) and d.get("message"):
            if attempt < retries - 1: continue
            raise RuntimeError(d["message"])
        return d


def unfold(text):
    # vCard linjebretting: linjer som starter med mellomrom/tab er fortsettelse.
    ut = []
    for line in text.splitlines():
        if line[:1] in (" ", "\t") and ut:
            ut[-1] += line[1:]
        else:
            ut.append(line)
    return ut


def navn_upper(navn):
    s = re.sub(r"[^0-9A-Za-zÆØÅæøåÄÖäö \-]", "", navn)  # fjern emoji/symboler
    return re.sub(r"\s+", " ", s).strip().upper()


def parse(text):
    kontakter = []
    cur = None
    for line in unfold(text):
        if line == "BEGIN:VCARD":
            cur = {"navn": "", "tel": [], "epost": "", "sted": "", "notat": "", "bday": ""}
        elif line == "END:VCARD":
            if cur and cur["navn"]:
                kontakter.append(cur)
            cur = None
        elif cur is not None:
            if ":" not in line:
                continue
            head, val = line.split(":", 1)
            navn_del = head.split(";")[0].split(".")[-1].upper()
            if navn_del == "FN":
                cur["navn"] = val.strip()
            elif navn_del == "TEL":
                t = val.strip()
                if t and t not in cur["tel"]:
                    cur["tel"].append(t)
            elif navn_del == "EMAIL" and not cur["epost"]:
                cur["epost"] = val.strip()
            elif navn_del == "ADR" and not cur["sted"]:
                felt = [f.strip() for f in val.split(";")]
                kand = [f for f in felt[:-1] if f]  # ikke land (siste)
                if kand:
                    cur["sted"] = kand[-1]
            elif navn_del == "NOTE":
                cur["notat"] = val.strip().replace("\\n", " ")
            elif navn_del == "BDAY":
                m = re.search(r"(\d{4})", val)
                if m:
                    cur["bday"] = m.group(1)
    return kontakter


def q(s):
    return "'" + (s or "").replace("'", "''") + "'"


def main():
    text = open(VCF, encoding="utf-8", errors="replace").read()
    ks = parse(text)
    print(f"{len(ks)} kontakter funnet i {os.path.basename(VCF)}")
    run_sql(f"delete from brreg.app_kontakt where brukernavn = {q(BRUKER)}")
    rows = []
    for k in ks:
        rows.append((k["navn"], navn_upper(k["navn"]), ", ".join(k["tel"]), k["epost"], k["sted"], k["notat"], k["bday"]))
    for i in range(0, len(rows), 200):
        b = rows[i:i + 200]
        vals = ",".join("(" + ",".join([q(BRUKER), q(n), q(nu), q(t), q(e), q(s), q(no), q(bd)]) + ")"
                        for n, nu, t, e, s, no, bd in b)
        run_sql(f"insert into brreg.app_kontakt (brukernavn,navn,navn_upper,telefon,epost,sted,notat,fodselsaar) values {vals}")
    tot = run_sql(f"select count(*) n, count(*) filter (where telefon<>'') m from brreg.app_kontakt where brukernavn={q(BRUKER)}")
    print(f"Ferdig: {tot[0]['n']} kontakter lagret ({tot[0]['m']} med telefon) for bruker '{BRUKER}'.")


if __name__ == "__main__":
    main()
