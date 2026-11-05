#!/usr/bin/env bash
# লোকাল PostgreSQL দিয়ে schema.sql এর RLS টেস্ট চালায়।
# দরকার: PostgreSQL 14+ (initdb, pg_ctl, psql)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUNAS=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$TMP"
  RUNAS=(sudo -u postgres env "PATH=$PATH")
  command -v sudo >/dev/null || RUNAS=(su postgres -s /bin/bash -c)
fi
run() { if [ "${RUNAS[0]:-}" = "su" ]; then "${RUNAS[@]}" "$*"; else "${RUNAS[@]}" "$@"; fi; }
cleanup() { run pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
run initdb -D "$TMP/data" -U postgres -A trust >/dev/null
run pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -c "create database khata" >/dev/null
"${PSQL[@]}" -d khata -f "$HERE/stub_auth.sql" >/dev/null
"${PSQL[@]}" -d khata -f "$ROOT/supabase/schema.sql" >/dev/null
# দ্বিতীয়বার চালালেও যেন ভাঙে না
"${PSQL[@]}" -d khata -f "$ROOT/supabase/schema.sql" >/dev/null
"${PSQL[@]}" -d khata -t -f "$HERE/rls_test.sql" | grep -E "PASSED"
