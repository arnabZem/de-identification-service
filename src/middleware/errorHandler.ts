import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, ErrorCode } from '../errors/AppError';
import { logger } from '../utils/logger';

/** Forwards unmatched routes to the error handler as 404. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, ErrorCode.NOT_FOUND, 'Route not found'));
};

/** Maps any thrown value to a standard `AppError`. Never reads or exposes `err.body`. */
function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const { type, status } = (err ?? {}) as { type?: string; status?: number };
  if (type === 'entity.too.large') return new AppError(413, ErrorCode.PAYLOAD_TOO_LARGE, 'Request body too large');
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new AppError(400, ErrorCode.INVALID_REQUEST, 'Malformed request');
  }
  return new AppError(500, ErrorCode.INTERNAL_ERROR, 'Internal server error');
}

/** The single error responder: `{ error: { code, message } }`. Stacks are logged for 5xx only. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err);
  if (appError.status >= 500) logger.error(err instanceof Error ? (err.stack ?? err.message) : 'Non-error thrown');
  res.locals.logFields = { ...res.locals.logFields, code: appError.code };
  res.status(appError.status).json({ error: { code: appError.code, message: appError.message } });
};
