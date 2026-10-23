import { ENTITY_TYPES } from '../../src/models/entity';
import { DeidentifyService } from '../../src/services/deidentify.service';

describe('DeidentifyService', () => {
  const service = new DeidentifyService();

  describe('de-identification', () => {
    test('replaces an email and reports the count', () => {
      expect(service.run('Contact john.doe@example.com today')).toEqual({
        text: 'Contact [EMAIL] today',
        counts: { EMAIL: 1 },
      });
    });

    test('replaces every occurrence of the same value', () => {
      const result = service.run('a@x.com and a@x.com');
      expect(result).toEqual({ text: '[EMAIL] and [EMAIL]', counts: { EMAIL: 2 } });
    });

    test('leaves names and other text unchanged', () => {
      expect(service.run('Patient John Doe').text).toBe('Patient John Doe');
    });
  });

  describe('entity selection', () => {
    test('defaults to all entity types when omitted', () => {
      expect(service.run('a@x.com').text).toBe(service.run('a@x.com', ENTITY_TYPES).text);
    });

    test('redacts only the selected types', () => {
      expect(service.run('a@x.com', ['EMAIL']).text).toBe('[EMAIL]');
    });

    test('leaves matches of unselected types untouched', () => {
      expect(service.run('a@x.com', ['PHONE'])).toEqual({ text: 'a@x.com', counts: {} });
    });

    test('duplicate selections are harmless', () => {
      expect(service.run('a@x.com', ['EMAIL', 'EMAIL']).counts).toEqual({ EMAIL: 1 });
    });
  });

  describe('edge input', () => {
    test.each([['empty', ''], ['whitespace-only', '  \n\t ']])('%s text is returned unchanged', (_n, text) => {
      expect(service.run(text)).toEqual({ text, counts: {} });
    });
  });

  describe('invariants', () => {
    const samples = [
      'plain text with no sensitive data',
      'Zoë 😀 e\u0301\r\n\u00a0tabs\tand\u2028separators',
      'x a@b.co y\r\n josé@exämple.com z',
    ];

    test.each(samples)('output is stable when applied twice: %j', (text) => {
      const once = service.run(text).text;
      expect(service.run(once).text).toBe(once);
    });

    test('text without sensitive data is byte-identical', () => {
      expect(service.run(samples[1]!).text).toBe(samples[1]);
    });

    test('count total equals placeholders inserted', () => {
      const { text, counts } = service.run(samples[2]!);
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      expect(text.match(/\[EMAIL\]/g)).toHaveLength(total);
    });
  });

  describe('performance', () => {
    test('processes ~1 MB of dense input within budget', () => {
      const input = 'user@example.com '.repeat(60_000);
      const start = Date.now();
      const result = service.run(input);
      expect(result.counts.EMAIL).toBe(60_000);
      expect(Date.now() - start).toBeLessThan(2000);
    });
  });
});
