#!/usr/bin/env bash
# Apply Saaf's database updates by hand, in order — each in ONE transaction, stopping at the first failure.
#
# Why this exists: the Supabase dashboard's SQL editor sent only the first part of 0034 on 2026-10-08
# ("unterminated dollar-quoted string"), and with twenty updates to apply a by-hand paste is the
# riskiest way to do it. A file is applied whole or not at all.
#
#   DATABASE_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' \
#     scripts/apply-migrations.sh 0034 0049
#
# The URL is Supabase → Connect → "Session pooler" (not "Transaction pooler"). It holds your database
# password, so type it into your own terminal — never into a chat or a file in the repo.
# Arguments: the first and (optionally) last migration number. Running one that is already applied fails
# at the first thing that exists — which stops the run and leaves the database as it was.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to the Supabase Session-pooler connection string}"
from="${1:?first migration number, e.g. 0034}"
to="${2:-9999}"
cd "$(dirname "$0")/../supabase/migrations"
count=0
for f in [0-9]*.sql; do
  n="${f%%_*}"
  if [[ "$n" < "$from" || "$n" > "$to" ]]; then continue; fi
  echo "applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -q -f "$f"
  count=$((count + 1))
done
echo "done — $count update(s) applied. Now run: npm run verify:rls"
