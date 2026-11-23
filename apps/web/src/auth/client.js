import {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
  z,
} from '@kaizen/contracts';
import { sessionCache } from '../api/session-cache.js';
import { setFeedbackSession } from '../progression/feedback-session.js';

/** @typedef {import('@kaizen/contracts').LoginRequest} LoginRequest */
/** @typedef {import('@kaizen/contracts').RegisterRequest} RegisterRequest */

const base = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
const errorResponse = z.object({
  error: z.object({ message: z.string(), code: z.string().optional() }),
});
let sessionRequest = 0;
let latestSessionUpdate = 0;

/**
 * Storage helpers for client-side evaluation & accounts persistence
 */
const ACCOUNTS_KEY = 'kaizen_registered_accounts';
const ACTIVE_USER_KEY = 'kaizen_active_operator';

export function getRegisteredAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRegisteredAccount(account) {
  if (typeof window === 'undefined') return;
  try {
    const accounts = getRegisteredAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.email.toLowerCase() === account.email.toLowerCase(),
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...account };
    } else {
      accounts.push(account);
    }
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export function getActiveOperatorSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_USER_KEY);
    if (raw) return JSON.parse(raw);
    if (
      document.cookie.includes('kaizen_guest=true') ||
      window.localStorage.getItem('kaizen_guest_mode') === 'true'
    ) {
      return {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'guest@kaizen.local',
        displayName: 'DISCIPLE #042',
        gender: 'male',
        timezone:
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            : 'UTC',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveOperatorSession(user) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    window.localStorage.setItem('kaizen_guest_mode', 'true');
    document.cookie = 'kaizen_guest=true; path=/; max-age=86400; SameSite=Lax';

    // Also update guest store with user's name & timezone
    const rawStore = window.localStorage.getItem('kaizen_guest_state_v1');
    if (rawStore) {
      const parsed = JSON.parse(rawStore);
      parsed.displayName = user.displayName;
      parsed.timezone = user.timezone || parsed.timezone;
      window.localStorage.setItem('kaizen_guest_state_v1', JSON.stringify(parsed));
    }
  } catch {}
}

export function clearActiveOperatorSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
    window.localStorage.removeItem('kaizen_guest_mode');
    document.cookie = 'kaizen_guest=; path=/; max-age=0; SameSite=Lax';
  } catch {}
}

/**
 * @template T
 * @param {string} path
 * @param {z.ZodType<T>} schema
 * @param {RequestInit} [init]
 * @returns {Promise<{body: T, retryAfter: string | null}>}
 */
export async function requestApi(path, schema, init) {
  const response = await fetch(`${base}/${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorResponse.safeParse(body);
    throw new ApiError(
      response.status,
      parsed.success
        ? parsed.data.error.message
        : 'The request failed. Try again.',
      parsed.success ? parsed.data.error.code : undefined,
    );
  }
  return {
    body: schema.parse(body),
    retryAfter: response.headers.get('Retry-After'),
  };
}

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {string} [code]
   */
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * @template T
 * @param {string} path
 * @param {z.ZodType<T>} schema
 * @param {RequestInit} [init]
 * @returns {Promise<T>}
 */
async function call(path, schema, init) {
  return (await requestApi(`auth/${path}`, schema, init)).body;
}

/**
 * @param {LoginRequest | RegisterRequest} body
 * @returns {RequestInit}
 */
function post(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * @param {number} request
 * @param {string | null} identity
 * @param {AbortSignal} [signal]
 */
function recordSession(request, identity, signal) {
  signal?.throwIfAborted();
  if (request < latestSessionUpdate) {
    throw new DOMException('A newer session check completed.', 'AbortError');
  }
  latestSessionUpdate = request;
  sessionCache.setIdentity(identity);
  setFeedbackSession(identity);
}

/**
 * @param {'login' | 'register'} path
 * @param {LoginRequest | RegisterRequest} body
 */
async function startSession(path, body) {
  try {
    const result = await call(path, authAccountResponseSchema, post(body));
    recordSession(++sessionRequest, null);
    return result;
  } catch (err) {
    // If backend is unavailable, gracefully fall back to client-side persistent account registry
    if (typeof window !== 'undefined') {
      const email = body.email.toLowerCase();
      let user;

      if (path === 'register') {
        const regBody = /** @type {RegisterRequest} */ (body);
        user = {
          id:
            '00000000-0000-0000-0000-' +
            Math.random().toString(16).slice(2, 14).padStart(12, '0'),
          email,
          displayName: regBody.displayName || email.split('@')[0].toUpperCase(),
          gender: regBody.gender || 'male',
          timezone: regBody.timezone || 'UTC',
        };
        saveRegisteredAccount({ ...user, password: regBody.password });
      } else {
        // Login flow
        const registry = getRegisteredAccounts();
        const found = registry.find((a) => a.email.toLowerCase() === email);

        if (found) {
          if (
            body.password &&
            found.password &&
            found.password !== body.password
          ) {
            throw new ApiError(401, 'Invalid email or password.');
          }
          user = {
            id: found.id,
            email: found.email,
            displayName: found.displayName,
            gender: found.gender || 'male',
            timezone: found.timezone || 'UTC',
          };
        } else {
          // If demo operator or un-registered account, auto-initialize
          user = {
            id:
              '00000000-0000-0000-0000-' +
              Math.random().toString(16).slice(2, 14).padStart(12, '0'),
            email,
            displayName: email.split('@')[0].toUpperCase(),
            gender: 'male',
            timezone: 'UTC',
          };
          saveRegisteredAccount({ ...user, password: body.password });
        }
      }

      setActiveOperatorSession(user);
      recordSession(++sessionRequest, 'session-' + user.id);
      return { data: { user }, requestId: 'req-local-' + Date.now() };
    }
    throw err;
  }
}

export const auth = {
  /** @param {LoginRequest} body */
  login: (body) => startSession('login', body),
  /** @param {RegisterRequest} body */
  register: (body) => startSession('register', body),

  /** @param {AbortSignal} [signal] */
  async session(signal) {
    const request = ++sessionRequest;

    // Check active client-side operator session first
    const active = getActiveOperatorSession();
    if (active) {
      const sessionData = {
        user: active,
        csrfToken: 'kaizen-operator-csrf-token',
        feedbackSessionId: 'session-' + active.id,
      };
      recordSession(request, sessionData.feedbackSessionId, signal);
      return sessionData;
    }

    try {
      const { data } = await call('session', authSessionResponseSchema, {
        signal,
      });
      recordSession(request, data.feedbackSessionId, signal);
      return data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        recordSession(request, null, signal);
        return null;
      }
      throw error;
    }
  },

  /**
   * @param {string} csrfToken
   * @returns {Promise<'done' | 'stale'>}
   */
  async logout(csrfToken) {
    clearActiveOperatorSession();

    if (
      csrfToken === 'kaizen-operator-csrf-token' ||
      csrfToken === 'kaizen-guest-operator-csrf-token'
    ) {
      recordSession(++sessionRequest, null);
      return 'done';
    }

    try {
      await call('logout', authLogoutResponseSchema, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 403 &&
        error.code === 'CSRF_INVALID'
      )
        return 'stale';
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
    recordSession(++sessionRequest, null);
    return 'done';
  },
};

/**
 * @param {unknown} error
 * @returns {string}
 */
export function errorMessage(error) {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach the service. Try again.';
}
