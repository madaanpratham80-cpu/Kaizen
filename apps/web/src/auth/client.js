import {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
  z,
} from '@kaizen/contracts';
import {
  clearGuestMode,
  enableGuestMode,
  isGuestMode,
  loadGuestState,
  saveGuestState,
} from '../api/guest-store.js';
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
 * Guest mode stands in only when there is no Kaizen API to talk to (network
 * failure, or a host that does not serve it). Errors the API itself returned,
 * such as wrong credentials or a duplicate email, always reach the user.
 * @param {unknown} error
 */
function apiUnavailable(error) {
  if (!(error instanceof ApiError)) return true;
  return (
    error.code === undefined &&
    (error.status === 404 || error.status === 405 || error.status >= 500)
  );
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
  } catch (error) {
    if (
      typeof window !== 'undefined' &&
      !(typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') &&
      apiUnavailable(error)
    ) {
      enableGuestMode();
      const guestState = loadGuestState();
      if ('displayName' in body && body.displayName) {
        guestState.displayName = body.displayName;
      }
      saveGuestState(guestState);
      recordSession(++sessionRequest, null);
      return {
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: body.email || 'disciple42@kaizen.local',
            displayName:
              ('displayName' in body && body.displayName) ||
              guestState.displayName ||
              'DISCIPLE #042',
            timezone: guestState.timezone || 'UTC',
          },
        },
      };
    }
    throw error;
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
    if (isGuestMode()) {
      const guestState = loadGuestState();
      const guestData = {
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'guest@kaizen.local',
          displayName: guestState?.displayName || 'DISCIPLE #042',
          timezone: guestState?.timezone || 'UTC',
        },
        csrfToken: 'kaizen-guest-csrf-token',
        feedbackSessionId: 'guest-session-id',
      };
      recordSession(request, guestData.feedbackSessionId, signal);
      return guestData;
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
      if (
        typeof window !== 'undefined' &&
        !(typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')
      ) {
        const path = window.location.pathname;
        const isAuthRoute =
          path === '/login' || path === '/register' || path === '/';
        if (isAuthRoute) {
          recordSession(request, null, signal);
          return null;
        }
        enableGuestMode();
        const guestState = loadGuestState();
        const guestData = {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'guest@kaizen.local',
            displayName: guestState?.displayName || 'DISCIPLE #042',
            timezone: guestState?.timezone || 'UTC',
          },
          csrfToken: 'kaizen-guest-csrf-token',
          feedbackSessionId: 'guest-session-id',
        };
        recordSession(request, guestData.feedbackSessionId, signal);
        return guestData;
      }
      throw error;
    }
  },
  /**
   * @param {string} csrfToken
   * @returns {Promise<'done' | 'stale'>}
   */
  async logout(csrfToken) {
    if (isGuestMode()) {
      clearGuestMode();
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
