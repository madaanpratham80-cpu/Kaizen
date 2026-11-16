import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Router } from 'express';
import { createApp } from '../src/app.js';
describe('auth-production-no-cors', () => {
  it('does not mount injected test routes in production', async () => {
    const routes = Router();
    routes.get('/probe', (_req, res) => res.sendStatus(200));
    await request(createApp({ nodeEnv: 'production', routes }))
      .get('/probe')
      .expect(404);
  });
  it('sends no CORS headers for a cross-origin production request', async () => {
    const response = await request(createApp({ nodeEnv: 'production' }))
      .get('/health/live')
      .set('Origin', 'https://another.example');
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });
  it('sends no CORS headers when NODE_ENV is unset', async () => {
    vi.stubEnv('NODE_ENV', undefined);
    try {
      const response = await request(createApp())
        .get('/health/live')
        .set('Origin', 'http://localhost:3000');
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(
        response.headers['access-control-allow-credentials'],
      ).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('allows only the configured local web origin in development', async () => {
    const app = createApp({
      nodeEnv: 'development',
      webOrigin: 'http://localhost:3000',
    });
    const allowed = await request(app)
      .get('/health/live')
      .set('Origin', 'http://localhost:3000');
    const denied = await request(app)
      .get('/health/live')
      .set('Origin', 'https://another.example');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
