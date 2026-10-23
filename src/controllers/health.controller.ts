import { RequestHandler } from 'express';

export class HealthController {
  /** GET /health: liveness probe. */
  getHealth: RequestHandler = (_req, res) => {
    res.json({ status: 'ok' });
  };
}
