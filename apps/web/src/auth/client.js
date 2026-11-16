import {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
  z,
} from '@kaizen/contracts';

/** @typedef {import('@kaizen/contracts').LoginRequest} LoginRequest */
/** @typedef {import('@kaizen/contracts').RegisterRequest} RegisterRequest */

const base = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
const errorResponse = z.object({
  error: z.object({ message: z.string(), code: z.string().optional() }),
});

/**
 * @template T
 * @param {string} path
 * @param {z.ZodType<T>} schema
 * @param {RequestInit} [init]
 * @returns {Promise<T>}
 */
async function call(path, schema, init) {
  const response = await fetch(`${base}/auth/${path}`, {
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
  return schema.parse(body);
}

class ApiError extends Error {
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

export const auth = {
  /** @param {LoginRequest} body */
  login: (body) => call('login', authAccountResponseSchema, post(body)),
  /** @param {RegisterRequest} body */
  register: (body) => call('register', authAccountResponseSchema, post(body)),
  /** @param {AbortSignal} [signal] */
  async session(signal) {
    try {
      return (await call('session', authSessionResponseSchema, { signal }))
        .data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
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
