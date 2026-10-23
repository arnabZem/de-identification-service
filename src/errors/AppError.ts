import { STATUS_CODES } from 'node:http';

/** Expected, client-facing error. `message` defaults to the HTTP reason phrase; never put request content in it. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message = STATUS_CODES[status],
  ) {
    super(message);
  }
}
