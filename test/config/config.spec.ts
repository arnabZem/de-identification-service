describe('config', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  const load = (env: Record<string, string> = {}) => {
    for (const k of ['PORT', 'MAX_BODY_BYTES', 'SHUTDOWN_TIMEOUT_MS', 'LOG_LEVEL']) delete process.env[k];
    Object.assign(process.env, env);
    let loaded!: typeof import('../../src/config/config').config;
    jest.isolateModules(() => {
      loaded = require('../../src/config/config').config;
    });
    return loaded;
  };

  describe('defaults', () => {
    test('applies defaults when nothing is set', () => {
      expect(load()).toEqual({ port: 3000, maxBodyBytes: 1_048_576, shutdownTimeoutMs: 10_000, logLevel: 'info' });
    });
  });

  describe('overrides', () => {
    test('reads values from the environment', () => {
      expect(load({ PORT: '8080', MAX_BODY_BYTES: '2048', SHUTDOWN_TIMEOUT_MS: '500', LOG_LEVEL: 'debug' })).toEqual({
        port: 8080,
        maxBodyBytes: 2048,
        shutdownTimeoutMs: 500,
        logLevel: 'debug',
      });
    });
  });

  describe('custom rules file', () => {
    test('is unset by default and when empty', () => {
      expect(load().customRulesFile).toBeUndefined();
      expect(load({ CUSTOM_RULES_FILE: '' }).customRulesFile).toBeUndefined();
    });

    test('reads the path from CUSTOM_RULES_FILE', () => {
      expect(load({ CUSTOM_RULES_FILE: '/etc/rules.json' }).customRulesFile).toBe('/etc/rules.json');
    });
  });

  describe('invalid values fail fast', () => {
    test.each([
      ['PORT', 'abc'],
      ['PORT', '0'],
      ['PORT', '-1'],
      ['PORT', '3000.5'],
      ['PORT', '70000'],
      ['PORT', ''],
      ['MAX_BODY_BYTES', 'big'],
      ['MAX_BODY_BYTES', '0'],
      ['SHUTDOWN_TIMEOUT_MS', 'soon'],
      ['LOG_LEVEL', 'verbose'],
    ])('%s=%j', (name, value) => {
      expect(() => load({ [name]: value as string })).toThrow(`Invalid ${name}`);
    });
  });
});
