import { createApp } from './app';
import { config } from './config/config';
import { logger } from './utils/logger';

const server = createApp().listen(config.port, (err?: Error) => {
  if (err) {
    logger.error(`Failed to start: ${err.message}`);
    process.exit(1);
  }
  logger.info('Listening', { port: config.port });
});

/** Stops accepting connections, drains in-flight requests, then exits. */
function shutdown(signal: string): void {
  logger.info('Shutting down', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), config.shutdownTimeoutMs).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
