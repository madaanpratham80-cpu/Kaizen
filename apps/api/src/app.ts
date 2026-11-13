import express from 'express';
import helmet from 'helmet';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());

app.get('/health/live', (_request, response) => {
  response.json({ status: 'live' });
});

app.get('/health/ready', (_request, response) => {
  response.status(503).json({ status: 'unready' });
});
