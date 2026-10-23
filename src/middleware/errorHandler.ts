import { STATUS_CODES } from 'node:http';
import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

/** Forwards unmatched routes to the error handler as 404. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404));
};

/** Reads a valid 4xx/5xx status from `err` (set by AppError and body-parser); anything else is 500. */
function statusOf(err: unknown): number {
  const { status, statusCode } = (err ?? {}) as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === 'number' && value >= 400 && STATUS_CODES[value] ? value : 500;
}

/**
 * The single error responder: `{ error: { status, message } }`.
 * Only an AppError's own message is exposed; other errors get their HTTP reason phrase,
 * since library messages may contain request content. Stacks are logged for 5xx only.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const status = statusOf(err);
  if (status >= 500) logger.error(err instanceof Error ? (err.stack ?? err.message) : 'Non-error thrown');
  const message = err instanceof AppError ? err.message : STATUS_CODES[status];
  res.status(status).json({ error: { status, message } });
};
