import { loginRequestSchema } from '@kaizen/contracts';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { z } from 'zod';
import { HttpError } from './boundary.js';

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

function accountKey(req: Request) {
  const parsed = emailSchema.safeParse({ email: req.body?.email });
  return parsed.success ? parsed.data.email : undefined;
}

export function createAuthRateLimits(
  config: Partial<z.input<typeof configSchema>> = {},
) {
  const { windowMs, registerAccount, registerIp, loginAccount, loginIp } =
    configSchema.parse(config);
  const options: Partial<Options> = {
    windowMs,
    standardHeaders: 'draft-7' as const,
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
  function forOperation(accountLimit: number, ipLimit: number) {
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
        skip: (req) => accountKey(req) === undefined,
        keyGenerator: (req) => accountKey(req) ?? '',
      }),
    ];
  }
  return {
    register: forOperation(registerAccount, registerIp),
    login: forOperation(loginAccount, loginIp),
  };
}
