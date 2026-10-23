import { loadConfig } from '../../src/config/env';

describe('loadConfig', () => {
  describe('defaults', () => {
    test('applies defaults when nothing is set', () => {
      expect(loadConfig({})).toEqual({ port: 3000, maxBodyBytes: 1_048_576, logLevel: 'info' });
    });
  });

  describe('overrides', () => {
    test('reads values from the environment', () => {
      expect(loadConfig({ PORT: '8080', MAX_BODY_BYTES: '2048', LOG_LEVEL: 'debug' })).toEqual({
        port: 8080,
        maxBodyBytes: 2048,
        logLevel: 'debug',
      });
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
      ['LOG_LEVEL', 'verbose'],
    ])('%s=%j', (name, value) => {
      expect(() => loadConfig({ [name]: value })).toThrow(`Invalid ${name}`);
    });
  });
});
