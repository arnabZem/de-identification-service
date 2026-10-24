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

    test('handles several entities in multi-line text', () => {
      const input = 'Name: Jane\r\nEmail: jane@x.com\r\nPhone: (212) 555-0199\r\nSSN: 123-45-6789\r\nCard: 5500 0000 0000 0004\r\nIP: 10.0.0.1';
      expect(service.run(input)).toEqual({
        text: 'Name: Jane\r\nEmail: [EMAIL]\r\nPhone: [PHONE]\r\nSSN: [SSN]\r\nCard: [CREDIT_CARD]\r\nIP: [IP_ADDRESS]',
        counts: { EMAIL: 1, PHONE: 1, SSN: 1, CREDIT_CARD: 1, IP_ADDRESS: 1 },
      });
    });

    test('leaves names and other text unchanged', () => {
      expect(service.run('Patient John Doe').text).toBe('Patient John Doe');
    });
  });

  describe('spec example', () => {
    test('de-identifies the example from the problem statement', () => {
      const input = 'Patient John Doe can be contacted at john.doe@example.com or +1-415-555-0134. DOB: 1990-05-12.';
      expect(service.run(input)).toEqual({
        text: 'Patient John Doe can be contacted at [EMAIL] or [PHONE]. DOB: [DATE_OF_BIRTH].',
        counts: { EMAIL: 1, PHONE: 1, DATE_OF_BIRTH: 1 },
      });
    });

    test('honors the selection from the problem statement', () => {
      expect(service.run('Contact john.doe@example.com at +1-415-555-0134', ['EMAIL', 'PHONE'])).toEqual({
        text: 'Contact [EMAIL] at [PHONE]',
        counts: { EMAIL: 1, PHONE: 1 },
      });
    });

    test.each([
      ['EMAIL', 'a@b.co', '[EMAIL]'],
      ['PHONE', '+1-415-555-0134', '[PHONE]'],
      ['SSN', '123-45-6789', '[SSN]'],
      ['DATE_OF_BIRTH', 'DOB: 1990-05-12', 'DOB: [DATE_OF_BIRTH]'],
      ['CREDIT_CARD', '4111 1111 1111 1111', '[CREDIT_CARD]'],
      ['IP_ADDRESS', '192.168.1.1', '[IP_ADDRESS]'],
    ] as const)('%s placeholder', (entity, input, expected) => {
      expect(service.run(input)).toEqual({ text: expected, counts: { [entity]: 1 } });
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

    test('a card is left fully intact when only PHONE is selected', () => {
      expect(service.run('Card 4111 1111 1111 1111', ['PHONE'])).toEqual({ text: 'Card 4111 1111 1111 1111', counts: {} });
    });

    test('an SSN is left fully intact when only PHONE is selected', () => {
      expect(service.run('SSN 234-56-7890', ['PHONE'])).toEqual({ text: 'SSN 234-56-7890', counts: {} });
    });

    test('only the selected types are replaced in mixed text', () => {
      expect(service.run('a@b.co 1.2.3.4 123-45-6789', ['IP_ADDRESS', 'SSN']).text).toBe('a@b.co [IP_ADDRESS] [SSN]');
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
      'Patient John Doe: john@example.com, +1-415-555-0134, DOB: 1990-05-12, SSN 123-45-6789, 4111 1111 1111 1111, 10.0.0.1',
      'No PII: order 1700000000, 2024-10-23, v1.2.3, 555-0134, 12,345.67',
    ];

    test.each(samples)('output is stable when applied twice: %j', (text) => {
      const once = service.run(text).text;
      expect(service.run(once).text).toBe(once);
    });

    test('text without sensitive data is byte-identical', () => {
      expect(service.run(samples[1]!).text).toBe(samples[1]);
    });

    test.each(samples)('count total equals placeholders inserted: %j', (input) => {
      const { text, counts } = service.run(input);
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      expect(text.match(/\[[A-Z_]+\]/g) ?? []).toHaveLength(total);
    });

    test('text outside replaced spans is unchanged', () => {
      const input = 'Zoë 😀 a@b.co\u00a0é\r\n+1-415-555-0134\tend';
      expect(service.run(input).text).toBe('Zoë 😀 [EMAIL]\u00a0é\r\n[PHONE]\tend');
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

    test('processes ~1 MB of dense mixed PII within budget', () => {
      const unit = 'a@b.co 123-45-6789 1.2.3.4 4111111111111111 DOB: 1990-05-12 +1-415-555-0134\n';
      const input = unit.repeat(Math.ceil(1_000_000 / unit.length));
      const start = Date.now();
      const { counts } = service.run(input);
      expect(Object.keys(counts).sort()).toEqual(['CREDIT_CARD', 'DATE_OF_BIRTH', 'EMAIL', 'IP_ADDRESS', 'PHONE', 'SSN']);
      expect(Date.now() - start).toBeLessThan(3000);
    });
  });
});
