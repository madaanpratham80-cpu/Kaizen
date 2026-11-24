import pino from 'pino';
import { isIP } from 'node:net';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  assignRequestId,
  handleHttpError,
  HttpError,
  loadSession,
  protectMutations,
  redactJson,
  requireJsonBody,
} from './http/boundary.js';
import { createAuthRateLimits } from './http/rate-limits.js';
import { createAuthRoutes } from './http/auth-routes.js';
import { createCalendarRoutes } from './http/calendar-routes.js';
import { databaseReady } from './ops/readiness.js';
import { recordRoute, requestLogs } from './http/request-logs.js';
import { lookupSession } from './services/sessions.js';
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
/** @typedef {import('express').RequestHandler} RequestHandler */
/** @typedef {import('express').Router} Router */
/** @typedef {{ database?: PrismaClient; nodeEnv?: string; webOrigin?: string; appOrigin?: string; csrfSecret?: string; trustedProxies?: string; rateLimits?: Parameters<typeof createAuthRateLimits>[0]; resolveSession?: (token: string) => ReturnType<typeof lookupSession>; routes?: Router; logger?: import('pino').Logger; deploymentVersion?: string; canServe?: () => boolean; }} AppOptions */
export const prisma = new PrismaClient();
/**
 * @param {string | undefined} config
 */
function proxyTrust(config) {
  if (!config) return false;
  const addresses = config.split(',').map((address) => address.trim());
  if (addresses.some((address) => !isIP(address))) {
    throw new Error(
      'TRUSTED_PROXY_IPS must contain only explicit IP addresses',
    );
  }
  return addresses;
}
/**
 * @param {RequestHandler} middleware
 * @returns {RequestHandler}
 */
function postOnly(middleware) {
  return (req, res, next) =>
    req.method === 'POST' && req.path === '/'
      ? middleware(req, res, next)
      : next();
}
/**
 * @param {AppOptions} [options]
 * @returns {import('express').Express}
 */
export function createApp({
  database = prisma,
  nodeEnv = process.env.NODE_ENV,
  webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  appOrigin = process.env.APP_ORIGIN,
  csrfSecret = process.env.SESSION_SECRET || process.env.AUTH_CSRF_SECRET,
  trustedProxies = process.env.TRUSTED_PROXY_IPS,
  rateLimits,
  resolveSession = (token) => lookupSession(database, token),
  routes,
  logger = pino({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info' }),
  deploymentVersion = process.env.DEPLOYMENT_VERSION ?? 'local',
  canServe = () => true,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', proxyTrust(trustedProxies));
  app.set('json replacer', redactJson);
  app.use(assignRequestId, requestLogs(logger, deploymentVersion, csrfSecret));
  app.use('/api/v1/auth', (_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  app.use(helmet({ strictTransportSecurity: nodeEnv === 'production' }));
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    const configuredOrigin = new URL(webOrigin);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(configuredOrigin.hostname)
    ) {
      throw new Error('WEB_ORIGIN must be a local web origin in development');
    }
    app.use(
      cors({
        credentials: true,
        origin: (requestOrigin, callback) =>
          callback(null, requestOrigin === configuredOrigin.origin),
      }),
    );
  }
  app.get('/health/live', recordRoute, (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ status: 'live' });
  });
  app.get('/health/ready', recordRoute, async (_request, response) => {
    const ready = canServe() && (await databaseReady(database)) && canServe();
    response
      .set('Cache-Control', 'no-store')
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'unready' });
  });
  app.use(requireJsonBody, express.json({ limit: '10kb', inflate: false }));
  app.use(loadSession(resolveSession), protectMutations(appOrigin, csrfSecret));
  const limits = createAuthRateLimits(rateLimits);
  app.use('/api/v1/auth/register', ...limits.register.map(postOnly));
  app.use('/api/v1/auth/login', ...limits.login.map(postOnly));
  if (nodeEnv === 'test' && routes) app.use(routes);
  app.use('/api/v1/auth', createAuthRoutes(database, csrfSecret));
  app.use('/api/v1', createCalendarRoutes(database, limits.reauthenticate));
  app.use((_req, _res, next) =>
    next(new HttpError(404, 'NOT_FOUND', 'Resource not found.')),
  );
  app.use(handleHttpError);
  return app;
}
export const app = createApp();
export default app;
