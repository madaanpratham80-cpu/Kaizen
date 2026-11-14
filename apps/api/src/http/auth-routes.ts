import {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
} from '@kaizen/contracts';
import type { PrismaClient } from '@prisma/client';
import {
  Router,
  type CookieOptions,
  type Request,
  type Response,
} from 'express';
import { loginAccount } from '../services/login.js';
import { registerAccount } from '../services/registration.js';
import { revokeSession } from '../services/sessions.js';
import { csrfProof, HttpError, SESSION_COOKIE } from './boundary.js';

const cookieOptions = {
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} satisfies CookieOptions;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function requireSession(req: Request) {
  if (!req.auth)
    throw new HttpError(401, 'SESSION_INVALID', 'Invalid session.');
  return req.auth;
}

export function createAuthRoutes(prisma: PrismaClient, secret?: string) {
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

  function accountHandler(
    service: typeof registerAccount | typeof loginAccount,
    status: number,
  ) {
    return async (req: Request, res: Response) => {
      requireSecret();
      const result = await service(prisma, req.body);
      if (!result.ok)
        throw new HttpError(result.status, result.code, result.message);
      const body = authAccountResponseSchema.parse({
        data: { user: result.user },
        requestId: req.requestId,
      });
      res.cookie(SESSION_COOKIE, result.sessionToken, {
        ...cookieOptions,
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
        },
        requestId: req.requestId,
      }),
    );
  });
  routes.post('/logout', async (req, res) => {
    const auth = requireSession(req);
    await revokeSession(prisma, auth.user.id, auth.session.token);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json(
      authLogoutResponseSchema.parse({
        data: { success: true },
        requestId: req.requestId,
      }),
    );
  });
  return routes;
}
