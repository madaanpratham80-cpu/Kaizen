import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { it } from 'vitest';
import { createApp } from '../../src/app.js';
import { useAuthDatabase } from './auth-fixture.js';

useAuthDatabase();

it('uses real PostgreSQL for readiness, unsets readiness while draining, and bounds pool contention', async () => {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  const database = new PrismaClient({ datasourceUrl: url.href });
  let serving = true;
  const api = request(createApp({ database, canServe: () => serving }));
  try {
    await api.get('/health/ready').expect(200, { status: 'ready' });
    serving = false;
    await api.get('/health/ready').expect(503);
    serving = true;
    await database.$transaction(
      async () => {
        await api.get('/health/ready').expect(503);
        await api.get('/health/live').expect(200, { status: 'live' });
      },
      { timeout: 2_000 },
    );
    await api.get('/health/ready').expect(200);
  } finally {
    await database.$disconnect();
  }
});
