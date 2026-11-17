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
  const result = await call(path, authAccountResponseSchema, post(body));
  recordSession(++sessionRequest, null);
  return result;
}

export const auth = {
  /** @param {LoginRequest} body */
  login: (body) => startSession('login', body),
  /** @param {RegisterRequest} body */
  register: (body) => startSession('register', body),
  /** @param {AbortSignal} [signal] */
  async session(signal) {
    const request = ++sessionRequest;
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
