import express from 'express';
import request from 'supertest';
import { AppError, ErrorCode } from '../../src/errors/AppError';
import { errorHandler, notFound } from '../../src/middleware/errorHandler';
import { logger } from '../../src/utils/logger';

const app = express();
app.use(express.json({ limit: 100 }));
app.get('/app-error', (_req, _res, next) => next(new AppError(418, ErrorCode.INVALID_REQUEST, 'teapot')));
app.get('/boom', () => {
  throw new Error('internal detail');
});
app.get('/non-error', () => {
  throw 'a string';
});
app.post('/echo', (_req, res) => void res.json({}));
app.use(notFound);
app.use(errorHandler);

describe('errorHandler', () => {
  let errorLog: jest.SpyInstance;
  beforeEach(() => {
    errorLog = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('AppError mapping', () => {
    test('uses the status, code and message of the AppError', async () => {
      const res = await request(app).get('/app-error').expect(418);
      expect(res.body).toEqual({ error: { code: 'INVALID_REQUEST', message: 'teapot' } });
      expect(errorLog).not.toHaveBeenCalled();
    });

    test('unknown routes return 404', async () => {
      const res = await request(app).get('/nope').expect(404);
      expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
    });
  });

  describe('body-parser mapping', () => {
    test('malformed JSON returns 400 without echoing the body', async () => {
      const res = await request(app).post('/echo').set('Content-Type', 'application/json').send('{"text": "SECRET-VALUE"').expect(400);
      expect(res.body).toEqual({ error: { code: 'INVALID_REQUEST', message: 'Malformed request' } });
      expect(JSON.stringify(res.body)).not.toContain('SECRET-VALUE');
    });

    test('oversized body returns 413', async () => {
      const res = await request(app).post('/echo').send({ text: 'x'.repeat(200) }).expect(413);
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('unexpected errors', () => {
    test('return a generic 500 without leaking details', async () => {
      const res = await request(app).get('/boom').expect(500);
      expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    });

    test('log the stack', async () => {
      await request(app).get('/boom');
      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('internal detail'));
    });

    test('handle non-Error throwables', async () => {
      await request(app).get('/non-error').expect(500);
      expect(errorLog).toHaveBeenCalledWith('Non-error thrown');
    });
  });
});
