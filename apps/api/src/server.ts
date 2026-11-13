import { app } from './app.js';
import pino from 'pino';

const logger = pino();
const port = Number(process.env.PORT ?? 4000);

const server = app.listen(port, () => {
  logger.info({ port }, 'API listening');
});

process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('API stopped');
  });
});
