import express from 'express';
import request from 'supertest';
import { AppError } from '../../src/errors/AppError';
import { errorHandler, notFound } from '../../src/middleware/errorHandler';
import { logger } from '../../src/utils/logger';

const app = express();
app.use(express.json({ limit: 100 }));
app.get('/app-error', (_req, _res, next) => next(new AppError(418, 'teapot')));
app.get('/boom', () => {
  throw new Error('internal detail');
});
app.get('/non-error', () => {
  throw 'a string';
});
app.get('/odd-status', (_req, _res, next) => next(Object.assign(new Error('x'), { status: 299 })));
app.get('/unknown-status', (_req, _res, next) => next(Object.assign(new Error('x'), { status: 499 })));
app.get('/status-code', (_req, _res, next) => next(Object.assign(new Error('x'), { statusCode: 403 })));
app.get('/sent', (_req, res, next) => {
  res.write('partial');
  next(new Error('late'));
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
    test('uses the status and message of the AppError', async () => {
      const res = await request(app).get('/app-error').expect(418);
      expect(res.body).toEqual({ error: { status: 418, message: 'teapot' } });
      expect(errorLog).not.toHaveBeenCalled();
    });

    test('unknown routes return 404', async () => {
      const res = await request(app).get('/nope').expect(404);
      expect(res.body).toEqual({ error: { status: 404, message: 'Not Found' } });
    });
  });

  describe('body-parser mapping', () => {
    test('malformed JSON returns 400 without echoing the body', async () => {
      const res = await request(app).post('/echo').set('Content-Type', 'application/json').send('{"text": "SECRET-VALUE"').expect(400);
      expect(res.body).toEqual({ error: { status: 400, message: 'Bad Request' } });
      expect(JSON.stringify(res.body)).not.toContain('SECRET-VALUE');
    });

    test('oversized body returns 413', async () => {
      const res = await request(app).post('/echo').send({ text: 'x'.repeat(200) }).expect(413);
      expect(res.body.error).toEqual({ status: 413, message: 'Payload Too Large' });
    });
  });

  describe('status handling', () => {
    test.each([
      ['a 2xx status', '/odd-status', 500],
      ['an unlisted status', '/unknown-status', 500],
      ['statusCode instead of status', '/status-code', 403],
    ])('%s', async (_n, path, expected) => {
      const res = await request(app).get(path).expect(expected);
      expect(res.body.error.message).not.toBe('x');
    });

    test('delegates to Express (closing the connection) once headers are sent', async () => {
      await expect(request(app).get('/sent')).rejects.toThrow();
    });
  });

  describe('unexpected errors', () => {
    test('return a generic 500 without leaking details', async () => {
      const res = await request(app).get('/boom').expect(500);
      expect(res.body).toEqual({ error: { status: 500, message: 'Internal Server Error' } });
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
