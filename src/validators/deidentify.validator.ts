import { RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from '../errors/AppError';
import { ENTITY_TYPES } from '../models/entity';

/** Rejects non-JSON requests with 415. */
const requireJson: RequestHandler = (req, _res, next) => {
  const ok = req.is('json');
  next(ok ? undefined : new AppError(415, 'Content-Type must be application/json'));
};

/** Converts validation failures to a 400 using the validators' static messages only. */
const validate: RequestHandler = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const message = [...new Set(errors.array().map((e) => e.msg))].join('; ');
  next(new AppError(400, message));
};

const ENTITY_MESSAGE = `entities must only contain: ${ENTITY_TYPES.join(', ')}`;

/** Validation chain for `POST /deidentify`. */
export const deidentifyValidator = [
  requireJson,
  body('text').isString().withMessage('text must be a string'),
  body('entities').optional().isArray({ min: 1 }).withMessage('entities must be a non-empty array'),
  body('entities.*').isString().withMessage(ENTITY_MESSAGE).isIn(ENTITY_TYPES).withMessage(ENTITY_MESSAGE),
  validate,
];
