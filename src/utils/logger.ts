import { config, LogLevel } from '../config/config';

type Fields = Record<string, string | number | undefined>;

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Creates a compact single-line logger: `<ISO time> <LEVEL> <message> key=value ...`.
 * Errors go to stderr, everything else to stdout.
 */
export function createLogger(minLevel: LogLevel) {
  const log = (level: LogLevel) => (message: string, fields: Fields = {}) => {
    if (RANK[level] < RANK[minLevel]) return;
    const pairs = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`);
    const line = [new Date().toISOString(), level.toUpperCase().padEnd(5), message, ...pairs].join(' ');
    (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

export const logger = createLogger(config.logLevel);
