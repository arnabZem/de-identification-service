import { RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from '../errors/AppError';
import { EntityType } from '../models/entity';
import { ENTITIES } from '../rules';

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

const ENTITY_MESSAGE = `entities must only contain: ${ENTITIES.join(', ')}`;

/**
 * True when every array item passes `check`; non-arrays pass, so `isArray` alone reports them.
 * One pass over the items: express-validator's `field.*` wildcards are quadratic in array length (a DoS on large arrays).
 */
const eachItem = (check: (item: unknown) => boolean) => (value: unknown) => !Array.isArray(value) || value.every(check);

const entities = [
  body('entities')
    .optional()
    .isArray({ min: 1 })
    .withMessage('entities must be a non-empty array')
    .custom(eachItem((e) => ENTITIES.includes(e as EntityType)))
    .withMessage(ENTITY_MESSAGE),
];

/** Validation chain for `POST /deidentify`. */
export const deidentifyValidator = [requireJson, body('text').isString().withMessage('text must be a string'), ...entities, validate];

/** Validation chain for `POST /deidentify/batch`. */
export const batchValidator = [
  requireJson,
  body('texts')
    .isArray({ min: 1 })
    .withMessage('texts must be a non-empty array')
    .custom(eachItem((t) => typeof t === 'string'))
    .withMessage('texts must only contain strings'),
  ...entities,
  validate,
];
