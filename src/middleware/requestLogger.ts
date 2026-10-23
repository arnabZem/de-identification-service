import { randomBytes } from 'node:crypto';
import { RequestHandler } from 'express';
import { logger } from '../utils/logger';

/**
 * Assigns a server-generated request id (`X-Request-Id`) and logs one line per request.
 * Extra fields come from `res.locals.logFields`. The query string and body are never logged.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  const id = randomBytes(6).toString('hex');
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);

  res.on('finish', () => {
    const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path} ${res.statusCode} ${ms}ms`, { id, ...res.locals.logFields });
  });
  next();
};
