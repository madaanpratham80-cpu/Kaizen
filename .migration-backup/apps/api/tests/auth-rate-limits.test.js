import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { sendData } from '../src/http/boundary.js';
const origin = 'https://kaizen.example';
const register = '/api/v1/auth/register';
const login = '/api/v1/auth/login';
function fixture(trustedProxies = '') {
  const routes = Router();
  routes.post([register, login], (_req, res) =>
    sendData(res, { accepted: true }),
  );
  const client = request(
    createApp({
      appOrigin: origin,
      trustedProxies,
      rateLimits: {
        registerAccount: 1,
        registerIp: 2,
        loginAccount: 1,
        loginIp: 2,
      },
      routes,
    }),
  );
  return (path, email, forwardedFor) =>
    client
      .post(path)
      .set('Origin', origin)
      .set('X-Forwarded-For', forwardedFor)
      .send({ email });
}
describe('auth-rate-limits', () => {
  it.each([register, login])(
    'limits normalized accounts across IPs at %s',
    async (path) => {
      const attempt = fixture('127.0.0.1');
      await attempt(path, '  STUDENT@example.com ', '192.0.2.10').expect(200);
      const blocked = await attempt(
        path,
        'student@example.com',
        '192.0.2.11',
      ).expect(429);
      expect(blocked.body).toEqual({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Try again later.',
        },
        requestId: blocked.headers['x-request-id'],
      });
      expect(blocked.body.requestId).toEqual(expect.any(String));
      expect(blocked.headers['cache-control']).toBe('private, no-store');
      await attempt(path, 'another@example.com', '192.0.2.12').expect(200);
      await attempt(
        path === register ? login : register,
        'student@example.com',
        '192.0.2.11',
      ).expect(200);
    },
  );
  it.each([register, login])(
    'limits by socket IP despite rotating forwarded IPs at %s',
    async (path) => {
      const attempt = fixture();
      await attempt(path, 'first@example.com', '192.0.2.10').expect(200);
      await attempt(path, 'invalid-email', '192.0.2.11').expect(200);
      const blocked = await attempt(
        path,
        'third@example.com',
        '192.0.2.12',
      ).expect(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
    },
  );
  it.each(['true', '1', '0.0.0.0/0'])(
    'rejects unsafe proxy configuration %s',
    (trustedProxies) => {
      expect(() => createApp({ trustedProxies })).toThrow('TRUSTED_PROXY_IPS');
    },
  );
});
