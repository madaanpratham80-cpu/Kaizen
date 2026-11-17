#!/usr/bin/env bash
set -eu
pilot_port=${1:-55434}
pilot_dir=$(mktemp -d "${TMPDIR:-/tmp}/kaizen-pilot-db.XXXXXX")
chmod 700 "$pilot_dir"
initdb -D "$pilot_dir" -A trust --no-instructions >/dev/null
pg_ctl -D "$pilot_dir" -l "$pilot_dir/postgres.log" -o "-h 127.0.0.1 -p $pilot_port -k $pilot_dir" -w start
cleanup() {
  pg_ctl -D "$pilot_dir" -m fast -w stop
  rm -rf -- "$pilot_dir"
}
trap cleanup EXIT
admin="postgresql://$(id -un)@127.0.0.1:$pilot_port/postgres"
psql "$admin" -Xq -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE kaizen_pilot_migration LOGIN;
CREATE ROLE kaizen_pilot_runtime LOGIN;
CREATE DATABASE kaizen_load_test OWNER kaizen_pilot_migration;
CREATE DATABASE kaizen_restore_test OWNER kaizen_pilot_migration;
SQL
export MIGRATION_DATABASE_URL="postgresql://kaizen_pilot_migration@127.0.0.1:$pilot_port/kaizen_load_test"
export DATABASE_URL="postgresql://kaizen_pilot_runtime@127.0.0.1:$pilot_port/kaizen_load_test?connection_limit=20"
runtime_psql="postgresql://kaizen_pilot_runtime@127.0.0.1:$pilot_port/kaizen_load_test"
pnpm --filter @kaizen/api db:migrate
psql "$MIGRATION_DATABASE_URL" -Xq -v ON_ERROR_STOP=1 <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO kaizen_pilot_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kaizen_pilot_runtime;
REVOKE ALL ON TABLE "_prisma_migrations" FROM kaizen_pilot_runtime;
SQL
test "$(psql "$runtime_psql" -XAt -c "SELECT current_user, has_schema_privilege(current_user, 'public','CREATE'), has_table_privilege(current_user, 'public.\"_prisma_migrations\"', 'SELECT')")" = 'kaizen_pilot_runtime|f|f'
psql "$runtime_psql" -XAt -c 'SELECT count(*) FROM "PlayerState"'
printf 'Runtime role can read application tables and lacks schema creation and migration history access.\n'
  pnpm --filter @kaizen/api verify:pilot --measure
  pnpm --filter @kaizen/api verify:pilot --reconcile > "$pilot_dir/source.reconcile"
  pg_dump "$MIGRATION_DATABASE_URL" --format=custom --no-owner --no-acl --file="$pilot_dir/kaizen.dump"
  restore_url="postgresql://kaizen_pilot_migration@127.0.0.1:$pilot_port/kaizen_restore_test"
  pg_restore --exit-on-error --no-owner --no-acl --dbname="$restore_url" "$pilot_dir/kaizen.dump"
  DATABASE_URL="$restore_url" pnpm --filter @kaizen/api verify:pilot --reconcile > "$pilot_dir/restored.reconcile"
  diff -u "$pilot_dir/source.reconcile" "$pilot_dir/restored.reconcile"
  cat "$pilot_dir/restored.reconcile"
  printf 'Restored backup matched source reconciliation and digest.\n'
