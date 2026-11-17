import {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
} from '@kaizen/contracts';
import { Router } from 'express';
import { loginAccount } from '../services/login.js';
import { registerAccount } from '../services/registration.js';
import { revokeSession } from '../services/sessions.js';
import { csrfProof, HttpError, SESSION_COOKIE } from './boundary.js';
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
export const sessionCookieOptions = {
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * @param {import('./boundary.js').KaizenRequest} req
 */
function requireSession(req) {
  if (!req.auth)
    throw new HttpError(401, 'SESSION_INVALID', 'Invalid session.');
  return req.auth;
}
/**
 * @param {PrismaClient} prisma
 * @param {string} [secret]
 * @returns {import('express').Router}
 */
export function createAuthRoutes(prisma, secret) {
  const routes = Router();
  function requireSecret() {
    if (!secret) {
      throw new HttpError(
        503,
        'AUTH_UNAVAILABLE',
        'Authentication is unavailable.',
      );
    }
    return secret;
  }
  function accountHandler(service, status) {
    return async (req, res) => {
      requireSecret();
      const result = await service(prisma, req.body);
      if (!result.ok)
        throw new HttpError(result.status, result.code, result.message);
      const body = authAccountResponseSchema.parse({
        data: { user: result.user },
        requestId: req.requestId,
      });
      res.cookie(SESSION_COOKIE, result.sessionToken, {
        ...sessionCookieOptions,
        maxAge: SESSION_LIFETIME_MS,
      });
      res.status(status).json(body);
    };
  }
  routes.post('/register', accountHandler(registerAccount, 201));
  routes.post('/login', accountHandler(loginAccount, 200));
  routes.get('/session', (req, res) => {
    const auth = requireSession(req);
    res.json(
      authSessionResponseSchema.parse({
        data: {
          user: auth.user,
          csrfToken: csrfProof(requireSecret(), auth.session.tokenHash),
          feedbackSessionId: csrfProof(
            requireSecret(),
            `feedback:${auth.session.tokenHash}`,
          ),
        },
        requestId: req.requestId,
      }),
    );
  });
  routes.post('/logout', async (req, res) => {
    const auth = requireSession(req);
    await revokeSession(prisma, auth.user.id, auth.session.token);
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    res.json(
      authLogoutResponseSchema.parse({
        data: { success: true },
        requestId: req.requestId,
      }),
    );
  });
  return routes;
}
