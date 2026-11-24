import { clearTimeout, setTimeout } from 'node:timers';
import { createApp, prisma } from './app.js';
import pino from 'pino';
import { drainServer } from './ops/drain.js';
import { migrateDatabase } from './ops/migrate.js';
import { verifyStoredBcryptCosts } from './services/bcrypt-config.js';

const logger = pino();
const port = Number(process.env.PORT);
const host = process.env.API_HOST ?? '0.0.0.0';
const MAX_SHUTDOWN_MS = 15_000;
let draining = false;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  logger.error('PORT must be a valid TCP port.');
  process.exit(1);
}
if (process.env.REPLIT_DATABASE_MIGRATIONS === 'app') {
  try {
    migrateDatabase();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}
try {
  await verifyStoredBcryptCosts(prisma);
} catch {
  logger.error(
    'Auth preflight failed. Check database access and configured bcrypt costs.',
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
}
const app = createApp({ logger, database: prisma, canServe: () => !draining });
const server = app.listen(port, host, () => {
  logger.info({ port }, 'API listening');
});
process.once('SIGTERM', async () => {
  draining = true;
  const hardStop = setTimeout(() => {
    logger.error('API shutdown exceeded its time limit');
    process.exit(1);
  }, MAX_SHUTDOWN_MS);
  hardStop.unref();
  try {
    await drainServer(server, prisma);
    logger.info('API stopped');
  } catch {
    logger.error('API shutdown failed');
    process.exitCode = 1;
  } finally {
    clearTimeout(hardStop);
  }
});
