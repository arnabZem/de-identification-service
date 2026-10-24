import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

// Loads the app with CUSTOM_RULES_FILE set, so config, registry and validator all see the custom rules.
const rulesFile = join(mkdtempSync(join(tmpdir(), 'custom-api-')), 'rules.json');
writeFileSync(
  rulesFile,
  JSON.stringify([
    { entity: 'MRN', pattern: 'MRN[: ]*(?<value>\\d{6,10})', flags: 'i' },
    { entity: 'NINE_DIGITS', pattern: '(?<!\\d)\\d{9}(?!\\d)' },
    { entity: 'ACCOUNT', pattern: 'ACCT-\\d{10}' },
  ]),
);
process.env.CUSTOM_RULES_FILE = rulesFile;
let app!: ReturnType<typeof import('../../src/app').createApp>;
jest.isolateModules(() => {
  app = require('../../src/app').createApp();
});
delete process.env.CUSTOM_RULES_FILE;

const post = (body: object) => request(app).post('/deidentify').send(body);

describe('custom rules (API)', () => {
  test('are applied by default alongside built-ins', async () => {
    const res = await post({ text: 'MRN: 12345678, email a@x.com' }).expect(200);
    expect(res.body).toEqual({ deidentifiedText: 'MRN: [MRN], email [EMAIL]', entitiesDetected: { MRN: 1, EMAIL: 1 } });
  });

  test('can be selected by name', async () => {
    const res = await post({ text: 'mrn 1234567 a@x.com', entities: ['MRN'] }).expect(200);
    expect(res.body).toEqual({ deidentifiedText: 'mrn [MRN] a@x.com', entitiesDetected: { MRN: 1 } });
  });

  test('rank below built-ins on equal-length overlaps', async () => {
    const res = await post({ text: 'id 123456789' }).expect(200);
    expect(res.body.entitiesDetected).toEqual({ SSN: 1 });
  });

  test('still win a longer overlap', async () => {
    const res = await post({ text: 'ACCT-4155550134' }).expect(200);
    expect(res.body).toEqual({ deidentifiedText: '[ACCOUNT]', entitiesDetected: { ACCOUNT: 1 } });
  });

  test('lose an equal-length overlap even when narrowed by `value`', async () => {
    const res = await post({ text: 'MRN 4155550134' }).expect(200);
    expect(res.body).toEqual({ deidentifiedText: 'MRN [PHONE]', entitiesDetected: { PHONE: 1 } });
  });

  test('are applied in batch requests', async () => {
    const res = await request(app).post('/deidentify/batch').send({ texts: ['MRN 123456', 'none'] }).expect(200);
    expect(res.body.results).toEqual([
      { deidentifiedText: 'MRN [MRN]', entitiesDetected: { MRN: 1 } },
      { deidentifiedText: 'none', entitiesDetected: {} },
    ]);
  });

  test('are listed in the unknown-entity error', async () => {
    const res = await post({ text: 'x', entities: ['ADDRESS'] }).expect(400);
    expect(res.body.error.message).toBe(
      'entities must only contain: CREDIT_CARD, SSN, DATE_OF_BIRTH, IP_ADDRESS, EMAIL, PHONE, NAME, MRN, NINE_DIGITS, ACCOUNT',
    );
  });
});
