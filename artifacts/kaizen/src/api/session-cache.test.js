import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth } from '../auth/client.js';
import { sessionCache } from './session-cache.js';

const sessionReply = (feedbackSessionId) =>
  Response.json({
    data: {
      user: {
        id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
        email: `${feedbackSessionId}@example.com`,
        displayName: feedbackSessionId,
        timezone: 'UTC',
      },
      csrfToken: 'proof',
      feedbackSessionId,
    },
    requestId: 'test',
  });

afterEach(() => {
  sessionCache.setIdentity(null);
  vi.unstubAllGlobals();
});

describe('session cache', () => {
  it('empties the cache and invalidates outstanding scopes on clear()', () => {
    sessionCache.setIdentity('session-a');
    const scope = sessionCache.forSession('session-a');
    scope.set('today', { health: 80 });
    expect(scope.get('today')).toEqual({ health: 80 });

    sessionCache.clear();

    expect(scope.signal.aborted).toBe(true);
    expect(scope.get('today')).toBeUndefined();
    expect(sessionCache.forSession('session-a').get('today')).toBeUndefined();
  });

  it('empties the cache when the session identity changes and blocks stale writes', () => {
    sessionCache.setIdentity('session-a');
    const a = sessionCache.forSession('session-a');
    a.set('today', { health: 80 });
    sessionCache.setIdentity('session-a');
    expect(a.get('today')).toEqual({ health: 80 });

    sessionCache.setIdentity('session-b');
    const b = sessionCache.forSession('session-b');
    a.set('today', { health: 80 });

    expect(a.signal.aborted).toBe(true);
    expect(sessionCache.forSession('session-a')).toBeNull();
    expect(b.get('today')).toBeUndefined();
    b.set('today', { health: 30 });
    expect(a.get('today')).toBeUndefined();
    expect(b.get('today')).toEqual({ health: 30 });
  });

  it('rejects an older session check after a newer account check completes', async () => {
    const first = Promise.withResolvers();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(sessionReply('session-b')),
    );

    const stale = auth.session();
    await auth.session();
    first.resolve(sessionReply('session-a'));

    await expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    expect(sessionCache.forSession('session-a')).toBeNull();
    expect(sessionCache.forSession('session-b')).not.toBeNull();
  });

  it('accepts out-of-order verification of the same active session', async () => {
    const first = Promise.withResolvers();
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(sessionReply('same-session')));

    const shell = auth.session();
    const screen = await auth.session();
    const scope = sessionCache.forSession('same-session');
    first.resolve(sessionReply('same-session'));

    await expect(shell).resolves.toEqual(screen);
    expect(scope.signal.aborted).toBe(false);
  });
});
