import { app, prisma } from './app.js';
import pino from 'pino';

const logger = pino();
const port = Number(process.env.PORT ?? 4000);

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
