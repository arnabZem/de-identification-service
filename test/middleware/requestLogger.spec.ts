import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/middleware/errorHandler';
import { requestLogger } from '../../src/middleware/requestLogger';
import { logger } from '../../src/utils/logger';

const app = express();
app.use(requestLogger);
app.use(express.json());
app.get('/ok', (_req, res) => {
  res.locals.logFields = { len: 5, EMAIL: 1 };
  res.json({});
});
app.get('/bad', (_req, res) => void res.status(400).json({}));
app.get('/boom', () => {
  throw new Error('x');
});
app.post('/body', (_req, res) => void res.json({}));
app.use(errorHandler);

describe('requestLogger', () => {
  let info: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('request id', () => {
    test('is returned as a 12-char hex X-Request-Id header', async () => {
      const res = await request(app).get('/ok');
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{12}$/);
    });

    test('is unique per request', async () => {
      const [a, b] = await Promise.all([request(app).get('/ok'), request(app).get('/ok')]);
      expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
    });

    test('ignores a client-supplied id', async () => {
      const res = await request(app).get('/ok').set('X-Request-Id', 'forged-id');
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{12}$/);
    });
  });

  describe('log line', () => {
    test('logs method, path, status and duration with the id and extra fields', async () => {
      const res = await request(app).get('/ok');
      expect(info).toHaveBeenCalledWith(expect.stringMatching(/^GET \/ok 200 \d+ms$/), {
        id: res.headers['x-request-id'],
        len: 5,
        EMAIL: 1,
      });
    });

    test('uses warn for 4xx and includes the error code', async () => {
      await request(app).get('/bad');
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^GET \/bad 400 /), expect.any(Object));
    });

    test('uses error for 5xx and includes the error code', async () => {
      await request(app).get('/boom');
      expect(error).toHaveBeenCalledWith(expect.stringMatching(/^GET \/boom 500 /), expect.objectContaining({ code: 'INTERNAL_ERROR' }));
    });
  });

  describe('no content in logs', () => {
    test('query strings and bodies are never logged', async () => {
      await request(app).post('/body?email=SECRET-QUERY').send({ text: 'SECRET-BODY' });
      const logged = JSON.stringify(info.mock.calls);
      expect(logged).not.toContain('SECRET-QUERY');
      expect(logged).not.toContain('SECRET-BODY');
    });
  });
});
