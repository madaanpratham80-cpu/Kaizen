import { createHash, createHmac } from 'node:crypto';
import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { sendData } from '../src/http/boundary.js';
const origin = 'https://kaizen.example';
const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function fixture(options = {}) {
  const routes = Router();
  const handler = vi.fn((req, res) => {
    expect(req.requestId).toMatch(idPattern);
    sendData(res, {
      authenticated: Boolean(req.auth),
      nested: [
        {
          displayName: 'Student',
          passwordHash: 'secret',
          tokenHash: 'secret',
          sessionToken: 'secret',
        },
      ],
    });
  });
  routes.all('/probe', handler);
  routes.get('/error', () => {
    throw new Error('private detail');
  });
  return {
    client: request(createApp({ ...options, appOrigin: origin, routes })),
    handler,
  };
}
describe('auth-http-boundary', () => {
  it('generates a request ID before dispatch and serializes only public fields', async () => {
    const { client, handler } = fixture();
    const response = await client.get('/probe');
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(response.headers['x-request-id']).toMatch(idPattern);
    expect(response.body).toEqual({
      data: { authenticated: false, nested: [{ displayName: 'Student' }] },
      requestId: response.headers['x-request-id'],
    });
  });
  it('uses the central error envelope without exposing internal messages', async () => {
    const { client } = fixture();
    const response = await client.get('/error');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
      requestId: response.headers['x-request-id'],
    });
    expect(response.body.requestId).toMatch(idPattern);
  });
  it.each([
    [
      'oversized JSON',
      'application/json',
      JSON.stringify({ data: 'a'.repeat(10_240) }),
      'BODY_TOO_LARGE',
    ],
    ['invalid JSON', 'application/json', '{', 'INVALID_BODY'],
    ['non-JSON', 'text/plain', 'hello', 'INVALID_BODY'],
  ])('rejects %s before dispatch', async (_label, type, body, code) => {
    const { client, handler } = fixture();
    const response = await client
      .post('/probe')
      .set('Origin', origin)
      .type(type)
      .send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code, message: expect.any(String) },
      requestId: response.headers['x-request-id'],
    });
    expect(response.body.requestId).toMatch(idPattern);
    expect(handler).not.toHaveBeenCalled();
  });
  it.each(['https://elsewhere.example', undefined])(
    'rejects a mutation with origin %s',
    async (requestOrigin) => {
      const { client, handler } = fixture();
      const pending = client.post('/probe');
      if (requestOrigin) pending.set('Origin', requestOrigin);
      const response = await pending.send({});
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'Origin is not allowed.',
        },
        requestId: response.headers['x-request-id'],
      });
      expect(handler).not.toHaveBeenCalled();
    },
  );
  it('loads a valid cookie session and requires its CSRF proof for mutations', async () => {
    const bytes = Buffer.alloc(32, 1);
    const token = bytes.toString('base64url');
    const tokenHash = createHash('sha256').update(bytes).digest('hex');
    const csrfSecret = 'fixture-secret';
    const proof = createHmac('sha256', csrfSecret)
      .update(tokenHash)
      .digest('base64url');
    const resolveSession = vi.fn().mockResolvedValue({
      ok: true,
      user: {
        id: 'fixture-user',
        email: 'user@example.com',
        displayName: 'Student',
        timezone: 'UTC',
      },
    });
    const { client } = fixture({ csrfSecret, resolveSession });
    const cookie = `__Host-kaizen_session=${token}`;
    await client.head('/probe').set('Cookie', cookie).expect(200);
    await client
      .post('/probe')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .send({})
      .expect(403);
    const response = await client
      .patch('/probe')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', proof)
      .send({})
      .expect(200);
    expect(resolveSession).toHaveBeenCalledWith(token);
    expect(response.body.data.authenticated).toBe(true);
    resolveSession.mockResolvedValueOnce({
      ok: false,
      code: 'SESSION_INVALID',
    });
    const invalid = await client
      .get('/probe')
      .set('Cookie', cookie)
      .expect(200);
    expect(invalid.body.data.authenticated).toBe(false);
  });
});
