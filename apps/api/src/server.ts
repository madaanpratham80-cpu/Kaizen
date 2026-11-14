import { app, prisma } from './app.js';
import pino from 'pino';
import { verifyStoredBcryptCosts } from './services/bcrypt-config.js';

const logger = pino();
const port = Number(process.env.PORT ?? 4000);

try {
  await verifyStoredBcryptCosts(prisma);
} catch {
  logger.error(
    'Auth preflight failed. Check database access and configured bcrypt costs.',
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
}

const server = app.listen(port, () => {
  logger.info({ port }, 'API listening');
});

process.on('SIGTERM', () => {
  server.close(() => {
    void prisma.$disconnect().then(
      () => logger.info('API stopped'),
      () => {
        logger.error('Failed to close the database pool');
        process.exitCode = 1;
      },
    );
  });
});
