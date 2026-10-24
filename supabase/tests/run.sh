#!/usr/bin/env bash
# Runs the database tests against a throw-away local PostgreSQL cluster (no Supabase account needed).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
PORT=${PGTEST_PORT:-54329}; DIR=$(mktemp -d /tmp/rasco_pg.XXXXXX); DB=rasco_test
if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; RUN="runuser -u postgres --"; else RUN=""; fi
cleanup() { $RUN "$PGBIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
$RUN "$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
PSQL="psql -h $DIR -p $PORT -U postgres -q -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "create database $DB" >/dev/null
PSQL="$PSQL -d $DB"
$PSQL -f "$HERE/stub_supabase.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -f "$f" >/dev/null; done
$PSQL -f "$ROOT/supabase/seed.sql" >/dev/null
$PSQL -f "$HERE/booking.test.sql" 2>&1 | grep -vE '^psql:.*NOTICE:  ok - ' | sed 's/^psql:.*NOTICE:  /  /' || { echo "DB TESTS FAILED"; exit 1; }
# t.ctx persists (not temp) so the concurrency script can reuse the same fixtures
$PSQL -c "update settings set retention_days = null" >/dev/null
bash "$HERE/concurrency.test.sh" "$PSQL"
