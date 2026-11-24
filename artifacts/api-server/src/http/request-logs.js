import { createHmac } from 'node:crypto';
import { performance } from 'node:perf_hooks';

/**
 * @type {import('express').RequestHandler}
 */
export function recordRoute(req, res, next) {
  res.locals.routeTemplate = req.baseUrl + req.route.path;
  next();
}

/**
 * @param {import('pino').Logger} logger
 * @param {string} deploymentVersion
 * @param {string | undefined} actorSecret
 * @returns {import('express').RequestHandler}
 */
export function requestLogs(logger, deploymentVersion, actorSecret) {
  return (req, res, next) => {
    const start = performance.now();
    res.once('close', () => {
      const actor = req.auth?.user.id;
      const actorId =
        actor && actorSecret
          ? createHmac('sha256', actorSecret)
              .update(`request-log:${actor}`)
              .digest('hex')
              .slice(0, 24)
          : null;
      logger.info(
        {
          requestId: req.requestId,
          route: res.locals.routeTemplate ?? 'unmatched',
          method: req.method,
          status: res.writableFinished ? res.statusCode : 499,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
          deploymentVersion,
          actorId,
        },
        'HTTP request',
      );
    });
    next();
  };
}
