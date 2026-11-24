import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const schema = fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url));

export function migrateDatabase(env = process.env) {
  const connection = env.MIGRATION_DATABASE_URL || env.DATABASE_URL;
  if (!connection) throw new Error('A database connection is required for migrations.');

  // Prisma's advisory lock needs a direct connection, not a transaction pooler.
  const direct = new URL(connection);
  direct.hostname = direct.hostname.replace('-pooler.', '.');
  const result = spawnSync(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', schema],
    {
      env: { ...env, DATABASE_URL: direct.toString() },
      // Prisma prints connection details. Keep those out of workflow logs.
      stdio: 'ignore',
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error('Prisma migrations failed. Check the database and migration history.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    migrateDatabase();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
