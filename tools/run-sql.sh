#!/usr/bin/env bash
# Kjør SQL mot Supabase via Management API (HTTPS/443).
#
# Hvorfor: enkelte miljøer (f.eks. Claude Code on the web) slipper kun ut
# HTTPS, mens Postgres-porten 5432 er blokkert. Da kan vi ikke bruke psql/JDBC
# direkte, men Management API-et tar imot SQL over 443.
#
# Krever miljøvariabler (legg dem i .env – se .env.example – og `source .env`):
#   SUPABASE_ACCESS_TOKEN   Personal Access Token (sbp_...) fra
#                           https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_REF    Prosjekt-ref (f.eks. ojvqmajyaexisglsykww)
#
# Bruk:
#   tools/run-sql.sh "select count(*) from brreg.enheter;"
#   tools/run-sql.sh -f db/schema.sql
#   echo "select 1;" | tools/run-sql.sh -
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?Sett SUPABASE_ACCESS_TOKEN (se .env.example)}"
: "${SUPABASE_PROJECT_REF:?Sett SUPABASE_PROJECT_REF (se .env.example)}"

case "${1:-}" in
  -f) SQL="$(cat "$2")" ;;
  -)  SQL="$(cat)" ;;
  "") echo "Bruk: $0 \"<sql>\" | -f <fil> | -" >&2; exit 2 ;;
  *)  SQL="$1" ;;
esac

# Bygg JSON-body trygt (escaping) med python, POST med curl.
BODY="$(SQL="$SQL" python3 -c 'import json,os;print(json.dumps({"query":os.environ["SQL"]}))')"

curl -sS -m 120 -X POST \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$BODY"
echo
