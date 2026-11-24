import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { appOrigins } from '../src/http/replit-origins.js';

describe('Replit same-origin API', () => {
  it('uses only the configured workspace and published domains', () => {
    const domains = {
      REPLIT_DOMAINS: 'kaizen.example, kaizen.replit.app',
      REPLIT_DEV_DOMAIN: 'kaizen.replit.dev',
    };
    expect(appOrigins(domains)).toEqual([
      'https://kaizen.example', 'https://kaizen.replit.app', 'https://kaizen.replit.dev',
    ]);
    expect(appOrigins({ ...domains, NODE_ENV: 'production' })).toEqual([
      'https://kaizen.example', 'https://kaizen.replit.app',
    ]);
    expect(appOrigins({ ...domains, APP_ORIGIN: 'https://kaizen.example/' })).toEqual([
      'https://kaizen.example',
    ]);
  });

  it('does not accept a request origin merely because it matches forwarded headers', async () => {
    const app = createApp({ appOrigin: 'https://kaizen.replit.dev' });
    await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://untrusted.example')
      .set('X-Forwarded-Host', 'untrusted.example')
      .send({})
      .expect(403);
  });
});
