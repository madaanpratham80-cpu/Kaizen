import { createServer, get } from 'node:http';
import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { recordRoute } from '../src/http/request-logs.js';
import { drainServer } from '../src/ops/drain.js';

const silent = { info: vi.fn() };

describe('deployment boundary', () => {
  it('reports independent liveness and bounded readiness without exposing errors', async () => {
    const database = {
      $transaction: vi.fn(async () => {
        throw new Error('private connection detail');
      }),
    };
    const api = request(
      createApp({ database, logger: silent, nodeEnv: 'production' }),
    );
    await api
      .get('/health/live')
      .set('Cookie', '__Host-kaizen_session=ignored')
      .expect(200)
      .expect('Strict-Transport-Security', /max-age=/);
    expect(database.$transaction).not.toHaveBeenCalled();
    await api
      .get('/health/ready')
      .expect(503, { status: 'unready' })
      .expect('Cache-Control', 'no-store');
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 250,
      timeout: 750,
    });
    await request(createApp({ database, logger: silent, nodeEnv: 'test' }))
      .get('/health/live')
      .expect(200)
      .expect(({ headers }) =>
        expect(headers['strict-transport-security']).toBeUndefined(),
      );
  });

  it('logs a template and stable actor pseudonym without using raw identifiers, URLs, or headers', async () => {
    const actor = 'actor-specific-id';
    const logger = { info: vi.fn() };
    const api = request(
      createApp({
        logger,
        deploymentVersion: 'build-17',
        csrfSecret: 'request-log-fixture',
        resolveSession: async () => ({ ok: true, user: { id: actor } }),
      }),
    );
    const response = await api
      .post(
        '/api/v1/occurrences/raw-identifier/complete?credential=secret-query',
      )
      .set('Cookie', '__Host-kaizen_session=opaque-secret')
      .set('Authorization', 'Bearer not-for-logs')
      .send({ password: 'private-password' })
      .expect(403);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        deploymentVersion: 'build-17',
        status: 403,
        requestId: response.headers['x-request-id'],
        actorId: expect.stringMatching(/^[a-f0-9]{24}$/),
        durationMs: expect.any(Number),
      }),
      'HTTP request',
    );
    const routes = Router();
    routes.get('/probe/:id', recordRoute, (_req, res) => res.sendStatus(200));
    const instrumented = request(
      createApp({ logger, routes, nodeEnv: 'test' }),
    );
    await instrumented
      .get('/probe/raw-identifier?foo=secret-query')
      .expect(200);
    expect(logger.info.mock.calls.at(-1)[0].route).toBe('/probe/:id');
    const messages = JSON.stringify(logger.info.mock.calls);
    for (const secret of [
      actor,
      'opaque-secret',
      'secret-query',
      'raw-identifier',
      'not-for-logs',
      'private-password',
    ]) {
      expect(messages).not.toContain(secret);
    }
  });

  it('allows the current request to finish before disconnecting Prisma', async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    const database = { $disconnect: vi.fn(async () => {}) };
    const server = createServer(async (_req, response) => {
      started.resolve();
      await release.promise;
      response.end('drained');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const pending = new Promise((resolve, reject) => {
      get(`http://127.0.0.1:${server.address().port}`, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve(body));
      }).on('error', reject);
    });
    await started.promise;
    const draining = drainServer(server, database);
    expect(server.listening).toBe(false);
    expect(database.$disconnect).not.toHaveBeenCalled();
    release.resolve();
    expect(await pending).toBe('drained');
    await draining;
    expect(database.$disconnect).toHaveBeenCalledOnce();
  });
});
