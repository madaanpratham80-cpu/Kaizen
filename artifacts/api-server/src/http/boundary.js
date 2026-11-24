import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').RequestHandler} RequestHandler */
/**
 * @typedef {import('express').Request & {
 *   requestId: string,
 *   auth: {
 *     user: import('@kaizen/contracts').PublicUser,
 *     session: { tokenHash: string, token: string },
 *   } | null,
 * }} KaizenRequest
 */
export const SESSION_COOKIE = '__Host-kaizen_session';
const MUTATIONS = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);
const PUBLIC_AUTH_PATHS = new Set([
  '/api/v1/auth/register',
  '/api/v1/auth/login',
]);
const PRIVATE_FIELDS = new Set([
  'passwordHash',
  'tokenHash',
  'password',
  'sessionToken',
  'token',
]);
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
/** @type {RequestHandler} */
export const assignRequestId = (req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
/** @type {RequestHandler} */
export const requireJsonBody = (req, _res, next) => {
  const hasBody =
    Boolean(req.headers['transfer-encoding']) ||
    Number(req.headers['content-length']) > 0;
  if (hasBody && !req.is('application/json')) {
    return next(
      new HttpError(400, 'INVALID_BODY', 'Request body must be JSON.'),
    );
  }
  next();
};
/**
 * @param {KaizenRequest} req
 */
function isPublicAuth(req) {
  return (
    req.method === 'POST' &&
    PUBLIC_AUTH_PATHS.has(req.path.toLowerCase().replace(/\/$/, ''))
  );
}
/**
 * @param {(token: string) => ReturnType<typeof import('../services/sessions.js').lookupSession>} resolveSession
 * @returns {RequestHandler}
 */
export function loadSession(resolveSession) {
  return async (req, _res, next) => {
    req.auth = null;
    if (!isPublicAuth(req)) {
      const cookies = req.headers.cookie
        ?.split(';')
        .map((cookie) => cookie.trim());
      const prefix = `${SESSION_COOKIE}=`;
      const matches = cookies?.filter((cookie) => cookie.startsWith(prefix));
      const token =
        matches?.length === 1 ? matches[0].slice(prefix.length) : undefined;
      if (token) {
        const result = await resolveSession(token);
        if (result.ok) {
          const tokenHash = createHash('sha256')
            .update(Buffer.from(token, 'base64url'))
            .digest('hex');
          req.auth = { user: result.user, session: { tokenHash, token } };
        }
      }
    }
    next();
  };
}
/**
 * @param {string} secret
 * @param {string} tokenHash
 * @returns {string}
 */
export function csrfProof(secret, tokenHash) {
  return createHmac('sha256', secret).update(tokenHash).digest('base64url');
}
/**
 * @param {string | string[] | undefined} appOrigin
 * @param {string | undefined} csrfSecret
 * @returns {RequestHandler}
 */
export function protectMutations(appOrigin, csrfSecret) {
  const allowedOrigins = new Set(Array.isArray(appOrigin) ? appOrigin : appOrigin ? [appOrigin] : []);
  return (req, _res, next) => {
    if (!MUTATIONS.has(req.method)) return next();
    if (!allowedOrigins.has(req.headers.origin)) {
      return next(
        new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'),
      );
    }
    if (req.auth && !isPublicAuth(req)) {
      const provided = req.get('X-CSRF-Token');
      const expected =
        csrfSecret && csrfProof(csrfSecret, req.auth.session.tokenHash);
      if (
        !provided ||
        !expected ||
        Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
      ) {
        return next(new HttpError(403, 'CSRF_INVALID', 'Invalid CSRF token.'));
      }
    }
    next();
  };
}
/**
 * @param {string} key
 * @param {unknown} value
 */
export function redactJson(key, value) {
  return PRIVATE_FIELDS.has(key) ? undefined : value;
}
/**
 * @param {Response} res
 * @param {unknown} data
 * @param {number} [status]
 * @returns {void}
 */
export function sendData(res, data, status = 200) {
  res.status(status).json({ data, requestId: res.req.requestId });
}
/** @type {import('express').ErrorRequestHandler} */
export const handleHttpError = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let response = new HttpError(
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred.',
  );
  if (error instanceof HttpError) {
    response = error;
  } else if (error?.type === 'entity.too.large') {
    response = new HttpError(400, 'BODY_TOO_LARGE', 'JSON body exceeds 10 KB.');
  } else if (
    error?.type === 'entity.parse.failed' ||
    error?.type === 'request.size.invalid'
  ) {
    response = new HttpError(400, 'INVALID_BODY', 'Invalid JSON body.');
  } else if (error?.status === 415) {
    response = new HttpError(
      415,
      'UNSUPPORTED_BODY',
      'Unsupported body encoding.',
    );
  }
  res.status(response.status).json({
    error: { code: response.code, message: response.message },
    requestId: req.requestId,
  });
};
