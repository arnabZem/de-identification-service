import express, { Request, Response } from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/middleware/errorHandler';
import { deidentifyValidator } from '../../src/validators/deidentify.validator';

const app = express();
app.use(express.json());
app.post('/v', deidentifyValidator, (_req: Request, res: Response) => void res.json({ ok: true }));
app.use(errorHandler);

const post = (body: unknown) => request(app).post('/v').send(body as object);

describe('deidentifyValidator', () => {
  describe('text', () => {
    test.each([['a string', 'hello'], ['empty', ''], ['whitespace-only', '   \n']])('accepts %s', async (_n, text) => {
      await post({ text }).expect(200);
    });

    test.each([
      ['missing', {}],
      ['null', { text: null }],
      ['a number', { text: 123 }],
      ['a boolean', { text: true }],
      ['an array', { text: ['a'] }],
      ['an object', { text: { a: 1 } }],
    ])('rejects %s', async (_n, body) => {
      const res = await post(body).expect(400);
      expect(res.body.error).toEqual({ status: 400, message: 'text must be a string' });
    });

    test('rejects an empty body', async () => {
      await request(app).post('/v').set('Content-Type', 'application/json').send('').expect(400);
    });

    test('rejects a non-object JSON root', async () => {
      await request(app).post('/v').set('Content-Type', 'application/json').send('[1]').expect(400);
    });
  });

  describe('entities', () => {
    test.each([['omitted', undefined], ['a valid list', ['EMAIL', 'PHONE']], ['all types', ['CREDIT_CARD', 'SSN', 'DATE_OF_BIRTH', 'IP_ADDRESS', 'EMAIL', 'PHONE']]])(
      'accepts %s',
      async (_n, entities) => {
        await post({ text: 'x', entities }).expect(200);
      },
    );

    test.each([
      ['an empty array', []],
      ['a string', 'EMAIL'],
      ['null', null],
      ['an object', { a: 'EMAIL' }],
    ])('rejects %s', async (_n, entities) => {
      const res = await post({ text: 'x', entities }).expect(400);
      expect(res.body.error.message).toBe('entities must be a non-empty array');
    });

    test.each([
      ['an unknown type', ['ADDRESS']],
      ['a lowercase type', ['email']],
      ['a number', [5]],
      ['null', [null]],
      ['a nested array', [['EMAIL']]],
      ['one bad among valid', ['EMAIL', 'ADDRESS']],
    ])('rejects a list containing %s', async (_n, entities) => {
      const res = await post({ text: 'x', entities }).expect(400);
      expect(res.body.error.message).toMatch(/^entities must only contain: /);
    });
  });

  describe('content type', () => {
    test('rejects text/plain with 415', async () => {
      const res = await request(app).post('/v').set('Content-Type', 'text/plain').send('{"text":"x"}').expect(415);
      expect(res.body.error.status).toBe(415);
    });

    test('rejects a missing content type with 415', async () => {
      await request(app).post('/v').expect(415);
    });

    test('accepts a charset parameter', async () => {
      await request(app).post('/v').set('Content-Type', 'application/json; charset=utf-8').send('{"text":"x"}').expect(200);
    });
  });

  describe('error messages', () => {
    test('never echo submitted values', async () => {
      const res = await post({ text: 123, entities: ['SECRET-VALUE'] }).expect(400);
      expect(JSON.stringify(res.body)).not.toContain('SECRET-VALUE');
    });

    test('combine distinct failures into one message', async () => {
      const res = await post({ text: 1, entities: [] }).expect(400);
      expect(res.body.error.message).toBe('text must be a string; entities must be a non-empty array');
    });
  });
});
