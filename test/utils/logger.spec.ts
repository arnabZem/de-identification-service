import { createLogger } from '../../src/utils/logger';

describe('logger', () => {
  let out: jest.SpyInstance;
  let err: jest.SpyInstance;
  beforeEach(() => {
    out = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    err = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('format', () => {
    test('writes `<ISO time> <LEVEL> <message> key=value` on one line', () => {
      createLogger('debug').info('POST /x 200 3ms', { id: 'ab', len: 5 });
      expect(out).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z INFO  POST \/x 200 3ms id=ab len=5\n$/));
    });

    test('omits undefined fields and works without fields', () => {
      createLogger('debug').warn('hello', { a: undefined });
      expect(out).toHaveBeenCalledWith(expect.stringMatching(/WARN  hello\n$/));
    });

    test('sends errors to stderr and everything else to stdout', () => {
      const log = createLogger('debug');
      log.error('bad');
      log.debug('dbg');
      expect(err).toHaveBeenCalledTimes(1);
      expect(out).toHaveBeenCalledTimes(1);
    });
  });

  describe('level filtering', () => {
    test.each([
      ['debug', 4],
      ['info', 3],
      ['warn', 2],
      ['error', 1],
    ] as const)('minimum level %s emits %i of 4 levels', (min, expected) => {
      const log = createLogger(min);
      log.debug('a');
      log.info('a');
      log.warn('a');
      log.error('a');
      expect(out.mock.calls.length + err.mock.calls.length).toBe(expected);
    });
  });
});
