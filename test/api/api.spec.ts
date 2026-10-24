import request from 'supertest';
import { createApp } from '../../src/app';
import { BUDGET_MS } from '../rules/helpers';

const app = createApp();
const post = (body: object) => request(app).post('/deidentify').send(body);

describe('API', () => {
  describe('POST /deidentify success', () => {
    test('de-identifies and reports counts', async () => {
      const res = await post({ text: 'Contact john.doe@example.com today' }).expect(200);
      expect(res.body).toEqual({ deidentifiedText: 'Contact [EMAIL] today', entitiesDetected: { EMAIL: 1 } });
    });

    test('de-identifies the problem-statement example', async () => {
      const res = await post({ text: 'Contact john.doe@example.com at +1-415-555-0134', entities: ['EMAIL', 'PHONE'] }).expect(200);
      expect(res.body).toEqual({ deidentifiedText: 'Contact [EMAIL] at [PHONE]', entitiesDetected: { EMAIL: 1, PHONE: 1 } });
    });

    test('de-identifies all six entity types by default', async () => {
      const text = 'Patient John Doe can be contacted at john.doe@example.com or +1-415-555-0134. DOB: 1990-05-12. SSN 123-45-6789, card 4111 1111 1111 1111, host 10.0.0.1.';
      const res = await post({ text }).expect(200);
      expect(res.body).toEqual({
        deidentifiedText: 'Patient John Doe can be contacted at [EMAIL] or [PHONE]. DOB: [DATE_OF_BIRTH]. SSN [SSN], card [CREDIT_CARD], host [IP_ADDRESS].',
        entitiesDetected: { EMAIL: 1, PHONE: 1, DATE_OF_BIRTH: 1, SSN: 1, CREDIT_CARD: 1, IP_ADDRESS: 1 },
      });
    });

    test('does not redact ordinary numbers', async () => {
      const text = 'Order 1700000000 shipped 2024-10-23, total 12,345.67, v1.2.3';
      const res = await post({ text }).expect(200);
      expect(res.body).toEqual({ deidentifiedText: text, entitiesDetected: {} });
    });

    test('honors entity selection', async () => {
      const res = await post({ text: 'a@x.com', entities: ['PHONE'] }).expect(200);
      expect(res.body).toEqual({ deidentifiedText: 'a@x.com', entitiesDetected: {} });
    });

    test('counts multiple occurrences', async () => {
      const res = await post({ text: 'a@x.com b@y.org' }).expect(200);
      expect(res.body.entitiesDetected).toEqual({ EMAIL: 2 });
    });

    test('returns empty and whitespace text unchanged', async () => {
      expect((await post({ text: '' }).expect(200)).body).toEqual({ deidentifiedText: '', entitiesDetected: {} });
      expect((await post({ text: ' \n ' }).expect(200)).body.deidentifiedText).toBe(' \n ');
    });

    test('preserves Unicode and line breaks', async () => {
      const text = '😀 José\r\nmail: josé@exämple.com\n終';
      const res = await post({ text }).expect(200);
      expect(res.body.deidentifiedText).toBe('😀 José\r\nmail: [EMAIL]\n終');
    });

    test('sets a request id header and JSON content type', async () => {
      const res = await post({ text: 'x' });
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('POST /deidentify failures', () => {
    test.each([
      ['missing text', {}],
      ['non-string text', { text: 5 }],
      ['unknown entity', { text: 'x', entities: ['ADDRESS'] }],
      ['empty entities', { text: 'x', entities: [] }],
    ])('400 for %s', async (_n, body) => {
      const res = await post(body).expect(400);
      expect(res.body.error.status).toBe(400);
    });

    test('400 for malformed JSON', async () => {
      await request(app).post('/deidentify').set('Content-Type', 'application/json').send('{bad').expect(400);
    });

    test('413 above the body limit', async () => {
      const res = await post({ text: 'a'.repeat(1_048_577) }).expect(413);
      expect(res.body.error).toEqual({ status: 413, message: 'Payload Too Large' });
    });

    test('415 for non-JSON content', async () => {
      await request(app).post('/deidentify').set('Content-Type', 'text/plain').send('hi').expect(415);
    });

    test('error bodies never contain request content', async () => {
      const res = await post({ text: 5, entities: ['SECRET-VALUE'] }).expect(400);
      expect(JSON.stringify(res.body)).not.toContain('SECRET-VALUE');
    });
  });

  describe('NAME', () => {
    test('redacts a labeled name and leaves unlabeled names alone', async () => {
      const text = 'Patient Name: John Doe, DOB: 1990-05-12. Patient John Doe was seen.';
      const res = await post({ text }).expect(200);
      expect(res.body).toEqual({
        deidentifiedText: 'Patient Name: [NAME], DOB: [DATE_OF_BIRTH]. Patient John Doe was seen.',
        entitiesDetected: { NAME: 1, DATE_OF_BIRTH: 1 },
      });
    });

    test('can be deselected', async () => {
      const res = await post({ text: 'Name: John Doe', entities: ['EMAIL'] }).expect(200);
      expect(res.body.deidentifiedText).toBe('Name: John Doe');
    });
  });

  describe('POST /deidentify/batch', () => {
    const batch = (body: object) => request(app).post('/deidentify/batch').send(body);

    test('de-identifies each text independently, in order', async () => {
      const res = await batch({ texts: ['a@x.com', 'no PII', '', 'Name: Jane Roe, call +1-415-555-0134'] }).expect(200);
      expect(res.body).toEqual({
        results: [
          { deidentifiedText: '[EMAIL]', entitiesDetected: { EMAIL: 1 } },
          { deidentifiedText: 'no PII', entitiesDetected: {} },
          { deidentifiedText: '', entitiesDetected: {} },
          { deidentifiedText: 'Name: [NAME], call [PHONE]', entitiesDetected: { NAME: 1, PHONE: 1 } },
        ],
      });
    });

    test('applies the entity selection to every text', async () => {
      const res = await batch({ texts: ['a@x.com +1-415-555-0134', 'b@y.org'], entities: ['EMAIL'] }).expect(200);
      expect(res.body.results.map((r: { deidentifiedText: string }) => r.deidentifiedText)).toEqual(['[EMAIL] +1-415-555-0134', '[EMAIL]']);
    });

    test('matches the single-text endpoint', async () => {
      const text = 'Patient John Doe can be contacted at john.doe@example.com or +1-415-555-0134. DOB: 1990-05-12.';
      const single = await post({ text }).expect(200);
      const res = await batch({ texts: [text] }).expect(200);
      expect(res.body.results).toEqual([single.body]);
    });

    test.each([
      ['missing texts', {}, 'texts must be a non-empty array'],
      ['texts not an array', { texts: 'abc' }, 'texts must be a non-empty array'],
      ['empty texts', { texts: [] }, 'texts must be a non-empty array'],
      ['non-string item', { texts: ['a', 5] }, 'texts must only contain strings'],
      ['null item', { texts: [null] }, 'texts must only contain strings'],
      ['empty entities', { texts: ['a'], entities: [] }, 'entities must be a non-empty array'],
    ])('400 for %s', async (_n, body, message) => {
      const res = await batch(body).expect(400);
      expect(res.body.error).toEqual({ status: 400, message });
    });

    test('400 for an unknown entity', async () => {
      const res = await batch({ texts: ['a'], entities: ['ADDRESS'] }).expect(400);
      expect(res.body.error.message).toMatch(/^entities must only contain: /);
    });

    test('413 when the whole batch exceeds the body limit', async () => {
      await batch({ texts: ['a'.repeat(600_000), 'b'.repeat(600_000)] }).expect(413);
    });

    test('415 for non-JSON content', async () => {
      await request(app).post('/deidentify/batch').set('Content-Type', 'text/plain').send('hi').expect(415);
    });

    test('error bodies never contain request content', async () => {
      const res = await batch({ texts: ['SECRET-VALUE', 5] }).expect(400);
      expect(JSON.stringify(res.body)).not.toContain('SECRET-VALUE');
    });
  });

  describe('performance', () => {
    test.each([
      ['100k valid entities', '/deidentify', { text: 'x', entities: Array(100_000).fill('EMAIL') }, 200],
      ['100k invalid entities', '/deidentify', { text: 'x', entities: Array(100_000).fill('XXXXX') }, 400],
      ['100k batch texts', '/deidentify/batch', { texts: Array(100_000).fill('') }, 200],
      ['100k invalid batch texts', '/deidentify/batch', { texts: Array(100_000).fill(0) }, 400],
    ])('validates %s in linear time', async (_n, path, body, status) => {
      const start = Date.now();
      await request(app).post(path).send(body).expect(status);
      expect(Date.now() - start).toBeLessThan(BUDGET_MS);
    }, 120_000);
  });

  describe('routing', () => {
    test('404 for unknown routes', async () => {
      const res = await request(app).get('/unknown').expect(404);
      expect(res.body).toEqual({ error: { status: 404, message: 'Not Found' } });
    });

    test('404 for GET /deidentify and for /healthz', async () => {
      await request(app).get('/deidentify').expect(404);
      await request(app).get('/healthz').expect(404);
    });
  });

  describe('GET /health', () => {
    test('returns ok', async () => {
      const res = await request(app).get('/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });
});
