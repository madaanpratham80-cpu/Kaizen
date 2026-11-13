import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

type AppOptions = {
  nodeEnv?: string;
  webOrigin?: string;
};

export function createApp({
  nodeEnv = process.env.NODE_ENV,
  webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000',
}: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    const configuredOrigin = new URL(webOrigin);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(configuredOrigin.hostname)
    ) {
      throw new Error('WEB_ORIGIN must be a local web origin in development');
    }
    app.use(
      cors({
        credentials: true,
        origin: (requestOrigin, callback) =>
          callback(null, requestOrigin === configuredOrigin.origin),
      }),
    );
  }

  app.get('/health/live', (_request, response) => {
    response.json({ status: 'live' });
  });

  app.get('/health/ready', (_request, response) => {
    response.status(503).json({ status: 'unready' });
  });

  return app;
}

export const app = createApp();
