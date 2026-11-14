import {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
  type LoginRequest,
  type RegisterRequest,
  z,
} from '@kaizen/contracts';

const base = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
const errorResponse = z.object({
  error: z.object({ message: z.string(), code: z.string().optional() }),
});

async function call<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${base}/auth/${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
  const body: unknown = await response.json().catch(() => null);
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
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function post(body: LoginRequest | RegisterRequest): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const auth = {
  login: (body: LoginRequest) =>
    call('login', authAccountResponseSchema, post(body)),
  register: (body: RegisterRequest) =>
    call('register', authAccountResponseSchema, post(body)),
  async session(signal?: AbortSignal) {
    try {
      return (await call('session', authSessionResponseSchema, { signal }))
        .data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  async logout(csrfToken: string): Promise<'done' | 'stale'> {
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

export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach the service. Try again.';
}
