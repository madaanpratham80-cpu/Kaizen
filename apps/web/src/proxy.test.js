import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config, proxy } from './proxy.js';

const internalOrigin = 'http://express.internal:4000';
const siteOrigin = 'https://kaizen.example';
const sessionCookie = '__Host-kaizen_session=sample-session';
const request = (cookie = '') =>
  new NextRequest(`${siteOrigin}/today`, { headers: { cookie } });

function expectLoginRedirect(response) {
  expect(response.status).toBe(307);
  expect(response.headers.get('Location')).toBe(`${siteOrigin}/login`);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(response.headers.has('x-middleware-next')).toBe(false);
  expect(response.body).toBeNull();
}

beforeEach(() => {
  vi.stubEnv('API_INTERNAL_ORIGIN', internalOrigin);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('signed-in route proxy', () => {
  it('matches the seven signed-in routes', () => {
    expect(config.matcher).toEqual([
      '/today',
      '/quests',
      '/habits',
      '/progress',
      '/profile',
      '/settings',
      '/onboarding',
    ]);
  });

  it('passes through on Express 200 without reading or forwarding the session body', async () => {
    const upstream = new Response('opaque session body', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const parse = vi.spyOn(upstream, 'json');
    const readText = vi.spyOn(upstream, 'text');
    fetch.mockResolvedValue(upstream);

    const response = await proxy(request(`theme=paper; ${sessionCookie}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.has('Location')).toBe(false);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.body).toBeNull();
    expect(parse).not.toHaveBeenCalled();
    expect(readText).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      new URL('/api/v1/auth/session', internalOrigin),
      {
        method: 'GET',
        headers: { cookie: sessionCookie },
        cache: 'no-store',
        redirect: 'error',
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('redirects an anonymous request to login', async () => {
    expectLoginRedirect(await proxy(request()));
  });

  it('never calls Express when the session cookie is missing', async () => {
    expectLoginRedirect(await proxy(request('theme=paper')));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects to login when Express returns 401', async () => {
    fetch.mockResolvedValue(new Response(null, { status: 401 }));
    expectLoginRedirect(await proxy(request(sessionCookie)));
  });

  it('redirects to login when Express returns 503', async () => {
    fetch.mockResolvedValue(new Response(null, { status: 503 }));
    expectLoginRedirect(await proxy(request(sessionCookie)));
  });

  it('redirects to login when the Express request times out', async () => {
    fetch.mockImplementation(
      (_url, { signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        }),
    );

    expectLoginRedirect(await proxy(request(sessionCookie)));
    expect(fetch.mock.calls[0][1].signal.reason.name).toBe('TimeoutError');
  });

  it('redirects to login when Express cannot be reached', async () => {
    fetch.mockRejectedValue(new TypeError('Connection refused'));
    expectLoginRedirect(await proxy(request(sessionCookie)));
  });

  it('fails closed when the internal origin is unset', async () => {
    vi.stubEnv('API_INTERNAL_ORIGIN', undefined);
    expectLoginRedirect(await proxy(request(sessionCookie)));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects ambiguous duplicate session cookies', async () => {
    expectLoginRedirect(
      await proxy(request(`${sessionCookie}; ${sessionCookie}`)),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
