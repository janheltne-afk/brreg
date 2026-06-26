#!/usr/bin/env python3
"""Legg til (eller oppdater passord for) en bruker i brreg.app_bruker.

Bruk:
  export SUPABASE_ACCESS_TOKEN=sbp_...; export SUPABASE_PROJECT_REF=<ref>
  python3 tools/legg-til-bruker.py <brukernavn> <passord>
"""
import os, sys, json, hashlib, subprocess

if len(sys.argv) < 3:
    print("Bruk: python3 tools/legg-til-bruker.py <brukernavn> <passord>"); sys.exit(2)

brukernavn, passord = sys.argv[1], sys.argv[2]
REF = os.environ["SUPABASE_PROJECT_REF"]
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
hash_ = hashlib.sha256(("brreg:" + passord).encode()).hexdigest()

q = (f"insert into brreg.app_bruker (brukernavn, passord_hash) "
     f"values ('{brukernavn.replace(chr(39), chr(39)*2)}', '{hash_}') "
     f"on conflict (brukernavn) do update set passord_hash = excluded.passord_hash")
out = subprocess.run(
    ["curl", "-sS", "-m", "60", "-X", "POST",
     f"https://api.supabase.com/v1/projects/{REF}/database/query",
     "-H", f"Authorization: Bearer {TOK}", "-H", "Content-Type: application/json",
     "--data", json.dumps({"query": q})], capture_output=True, text=True).stdout
print(f"Bruker '{brukernavn}' lagret." if "[]" in out or out.strip() == "[]" else f"Svar: {out[:200]}")
