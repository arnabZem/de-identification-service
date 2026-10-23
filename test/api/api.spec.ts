import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();
const post = (body: object) => request(app).post('/deidentify').send(body);

describe('API', () => {
  describe('POST /deidentify success', () => {
    test('de-identifies and reports counts', async () => {
      const res = await post({ text: 'Contact john.doe@example.com today' }).expect(200);
      expect(res.body).toEqual({ deidentifiedText: 'Contact [EMAIL] today', entitiesDetected: { EMAIL: 1 } });
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
      ['unknown entity', { text: 'x', entities: ['NAME'] }],
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
