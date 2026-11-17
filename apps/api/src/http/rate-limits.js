import { loginRequestSchema } from '@kaizen/contracts';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { HttpError } from './boundary.js';

/** @typedef {import('express').RequestHandler} RequestHandler */
const emailSchema = loginRequestSchema.pick({ email: true });
const positiveInteger = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const configSchema = z.object({
  windowMs: positiveInteger.default(15 * 60 * 1000),
  registerAccount: positiveInteger.default(5),
  registerIp: positiveInteger.default(25),
  loginAccount: positiveInteger.default(10),
  loginIp: positiveInteger.default(50),
});
/**
 * @param {import('express').Request} req
 */
function accountKey(req) {
  const parsed = emailSchema.safeParse({ email: req.body?.email });
  return parsed.success ? parsed.data.email : undefined;
}
/**
 * @param {Partial<import('zod').input<typeof configSchema>>} [config]
 * @returns {{register: RequestHandler[], login: RequestHandler[], reauthenticate: RequestHandler[]}}
 */
export function createAuthRateLimits(config = {}) {
  const { windowMs, registerAccount, registerIp, loginAccount, loginIp } =
    configSchema.parse(config);
  const options = {
    windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new HttpError(
          429,
          'RATE_LIMITED',
          'Too many attempts. Try again later.',
        ),
      ),
  };
  function forOperation(accountLimit, ipLimit, identify = accountKey) {
    return [
      rateLimit({
        ...options,
        limit: ipLimit,
        keyGenerator: (req) =>
          ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? ''),
      }),
      rateLimit({
        ...options,
        limit: accountLimit,
        skip: (req) => identify(req) === undefined,
        keyGenerator: (req) => identify(req) ?? '',
      }),
    ];
  }
  return {
    register: forOperation(registerAccount, registerIp),
    login: forOperation(loginAccount, loginIp),
    reauthenticate: forOperation(
      loginAccount,
      loginIp,
      (req) => req.auth?.user.id,
    ),
  };
}
