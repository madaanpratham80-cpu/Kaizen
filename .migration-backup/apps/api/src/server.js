import { clearTimeout, setTimeout } from 'node:timers';
import { createApp, prisma } from './app.js';
import pino from 'pino';
import { drainServer } from './ops/drain.js';
import { verifyStoredBcryptCosts } from './services/bcrypt-config.js';

const logger = pino();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.API_HOST ?? '127.0.0.1';
const MAX_SHUTDOWN_MS = 15_000;
let draining = false;
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
