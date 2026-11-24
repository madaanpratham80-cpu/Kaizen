// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, auth } from './client.js';
import { isGuestMode, clearGuestMode } from '../api/guest-store.js';

const credentials = { email: 'user@example.com', password: 'a-long-enough-password' };
const apiError = (status, error) =>
  Response.json({ error, requestId: 'test' }, { status });

beforeEach(() => {
  vi.stubEnv('MODE', 'development');
  clearGuestMode();
});
afterEach(() => {
  clearGuestMode();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('auth-login-guest-fallback', () => {
  it('shows wrong-credentials errors instead of entering guest mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        apiError(401, { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }),
      ),
    );
    await expect(auth.login(credentials)).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password.',
    });
    expect(isGuestMode()).toBe(false);
  });

  it('shows duplicate-email errors instead of entering guest mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        apiError(409, { code: 'EMAIL_TAKEN', message: 'That email is already registered.' }),
      ),
    );
    await expect(
      auth.register({ ...credentials, displayName: 'User', gender: 'male', timezone: 'UTC' }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(isGuestMode()).toBe(false);
  });

  it('falls back to guest mode when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(auth.login(credentials)).resolves.toMatchObject({
      data: { user: { email: credentials.email } },
    });
    expect(isGuestMode()).toBe(true);
  });

  it('falls back to guest mode when the host does not serve the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Not found</html>', { status: 404 })),
    );
    await auth.login(credentials);
    expect(isGuestMode()).toBe(true);
  });
});
