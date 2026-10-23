import express, { Express } from 'express';
import { config } from './config/config';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import routes from './routes';

/** Builds the Express app (wiring only; no listening). */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: config.maxBodyBytes }));
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
