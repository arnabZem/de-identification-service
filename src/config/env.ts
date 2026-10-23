export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface Config {
  port: number;
  maxBodyBytes: number;
  logLevel: LogLevel;
}

type Env = Record<string, string | undefined>;

/** Reads an integer in [1, max] from `env`, or returns `fallback` when unset. Throws on invalid values. */
function readInt(env: Env, name: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

/** Builds the service config from environment variables; fails fast on invalid values. */
export function loadConfig(env: Env = process.env): Config {
  const logLevel = env.LOG_LEVEL ?? 'info';
  if (!LOG_LEVELS.includes(logLevel as LogLevel)) throw new Error('Invalid LOG_LEVEL');
  return {
    port: readInt(env, 'PORT', 3000, 65535),
    maxBodyBytes: readInt(env, 'MAX_BODY_BYTES', 1_048_576),
    logLevel: logLevel as LogLevel,
  };
}

export const config = loadConfig();
