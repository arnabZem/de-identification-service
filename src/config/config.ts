const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Positive decimal integer from the environment, or `fallback` when unset or empty. Throws on invalid values. */
function int(name: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  // Digits only: Number() alone also accepts ' 80', '1e3', '0x10' and '80.0'.
  if (!/^\d+$/.test(raw) || value < 1 || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

/** One of `allowed` from the environment, or `fallback` when unset. Throws on invalid values. */
function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const raw = process.env[name] ?? fallback;
  if (!allowed.includes(raw as T)) throw new Error(`Invalid ${name}`);
  return raw as T;
}

/** Service settings; each can be overridden by the environment variable named in its call. */
export const config = {
  port: int('PORT', 3000, 65535),
  maxBodyBytes: int('MAX_BODY_BYTES', 1_048_576),
  shutdownTimeoutMs: int('SHUTDOWN_TIMEOUT_MS', 10_000),
  logLevel: oneOf('LOG_LEVEL', LOG_LEVELS, 'info'),
  /** Optional path to a JSON file of custom rules (see `rules/custom.ts`). */
  customRulesFile: process.env.CUSTOM_RULES_FILE || undefined,
};
