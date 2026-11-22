#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo 'auth-migration-empty-db: DATABASE_URL is required' >&2
  exit 1
fi

psql_url=$(node -e 'const url = new URL(process.env.DATABASE_URL); const name = decodeURIComponent(url.pathname.slice(1)); if (!name.includes("test") || !url.username) { process.stderr.write("auth-migration-empty-db: URL needs a username and a database name containing test\n"); process.exit(1); } if (url.searchParams.get("schema") && url.searchParams.get("schema") !== "public") { process.stderr.write("auth-migration-empty-db: only the public schema is supported\n"); process.exit(1); } url.searchParams.delete("schema"); process.stdout.write(url.href)')

database_name=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc 'SELECT current_database()')
expected_name=$(node -e 'process.stdout.write(decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)))')
if [[ "$database_name" != "$expected_name" ]]; then
  echo 'auth-migration-empty-db: psql and Prisma database targets differ' >&2
  exit 1
fi

table_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')")
history_table_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_tables WHERE tablename = '_prisma_migrations'")
if [[ "$table_count" != '0' || "$history_table_count" != '0' ]]; then
  echo 'auth-migration-empty-db: expected no user tables or Prisma migration history in any schema' >&2
  exit 1
fi

CI=true pnpm --filter @kaizen/api exec prisma migrate deploy

table_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('User', 'Session')")
unique_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('User_normalizedEmail_key', 'Session_tokenHash_key') AND indexdef LIKE 'CREATE UNIQUE INDEX%'")
expiry_index_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Session_expiresAt_idx'")
foreign_key_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_constraint WHERE conname = 'Session_userId_fkey' AND contype = 'f'")
display_name_count=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'displayName' AND is_nullable = 'NO'")
quest_client_id_column=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Quest' AND column_name = 'clientId' AND is_nullable = 'YES' AND udt_name = 'uuid'")
quest_client_id_index=$(psql "$psql_url" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Quest_userId_clientId_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%'")

if [[ "$table_count" != '2' || "$unique_count" != '2' || "$expiry_index_count" != '1' || "$foreign_key_count" != '1' || "$display_name_count" != '1' || "$quest_client_id_column" != '1' || "$quest_client_id_index" != '1' ]]; then
  echo 'auth-migration-empty-db: expected tables or constraints are missing' >&2
  exit 1
fi

echo 'auth-migration-empty-db: passed'
