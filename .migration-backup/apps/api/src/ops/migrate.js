import { spawnSync } from 'node:child_process';

const { MIGRATION_DATABASE_URL, ...environment } = process.env;
if (!MIGRATION_DATABASE_URL) {
  process.stderr.write(
    'MIGRATION_DATABASE_URL is required for migration deployment.\n',
  );
  process.exitCode = 1;
} else {
  const result = spawnSync('prisma', ['migrate', 'deploy'], {
    env: { ...environment, DATABASE_URL: MIGRATION_DATABASE_URL },
    stdio: 'inherit',
  });
  if (result.error)
    process.stderr.write('Could not start the Prisma migration command.\n');
  process.exitCode = result.status ?? 1;
}
