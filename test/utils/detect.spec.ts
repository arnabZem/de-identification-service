import { Rule } from '../../src/models/detection';
import { EntityType, Span } from '../../src/models/entity';
import { detect } from '../../src/utils/detect';

const rule = (entity: EntityType, ...ranges: [number, number][]): Rule => ({
  entity,
  find: () => ranges.map(([start, end]) => ({ start, end, entity })),
});

describe('detect', () => {
  describe('collecting spans', () => {
    test('returns spans from every rule, sorted by start', () => {
      const spans = detect('x'.repeat(30), [rule('PHONE', [20, 25]), rule('EMAIL', [0, 5]), rule('SSN', [10, 15])]);
      expect(spans.map((s) => s.entity)).toEqual(['EMAIL', 'SSN', 'PHONE']);
    });

    test('returns nothing when no rule matches', () => {
      expect(detect('hello', [rule('EMAIL')])).toEqual([]);
    });

    test('returns nothing for empty text or no rules', () => {
      expect(detect('', [rule('EMAIL')])).toEqual([]);
      expect(detect('hello', [])).toEqual([]);
    });
  });

  describe('overlap resolution', () => {
    test('longest span wins over a contained span', () => {
      const spans = detect('x'.repeat(30), [rule('PHONE', [5, 15]), rule('CREDIT_CARD', [0, 20])]);
      expect(spans).toEqual<Span[]>([{ start: 0, end: 20, entity: 'CREDIT_CARD' }]);
    });

    test('a longer lower-priority span beats a shorter higher-priority one', () => {
      const spans = detect('x'.repeat(30), [rule('SSN', [0, 5]), rule('PHONE', [0, 10])]);
      expect(spans).toEqual<Span[]>([{ start: 0, end: 10, entity: 'PHONE' }]);
    });

    test('equal length: higher-priority entity wins', () => {
      const spans = detect('x'.repeat(30), [rule('PHONE', [0, 10]), rule('CREDIT_CARD', [0, 10]), rule('EMAIL', [0, 10])]);
      expect(spans).toEqual<Span[]>([{ start: 0, end: 10, entity: 'CREDIT_CARD' }]);
    });

    test('partially overlapping spans: the winner is kept whole and the loser keeps its uncovered part', () => {
      const spans = detect('x'.repeat(30), [rule('PHONE', [0, 10]), rule('EMAIL', [8, 22])]);
      expect(spans).toEqual<Span[]>([
        { start: 0, end: 8, entity: 'PHONE' },
        { start: 8, end: 22, entity: 'EMAIL' },
      ]);
    });

    test('the uncovered part is trimmed to its letters and digits', () => {
      const spans = detect('xx -xxxxxxxxx', [rule('PHONE', [0, 6]), rule('EMAIL', [4, 13])]);
      expect(spans).toEqual<Span[]>([
        { start: 0, end: 2, entity: 'PHONE' },
        { start: 4, end: 13, entity: 'EMAIL' },
      ]);
    });

    test('an uncovered part with no letters or digits is left as is', () => {
      const spans = detect(' - xxxxxxxx', [rule('PHONE', [0, 5]), rule('EMAIL', [3, 11])]);
      expect(spans).toEqual<Span[]>([{ start: 3, end: 11, entity: 'EMAIL' }]);
    });

    test('trimming keeps astral letters and combining marks inside the span', () => {
      const text = 'x\u0301\u{1D49C} xxxxxxxx';
      const spans = detect(text, [rule('PHONE', [0, 6]), rule('EMAIL', [5, text.length])]);
      expect(spans[0]).toEqual<Span>({ start: 0, end: 4, entity: 'PHONE' });
    });

    test('never redacts less than dropping the loser would', () => {
      const text = 'x'.repeat(40);
      const rules = [rule('PHONE', [0, 12]), rule('EMAIL', [10, 30]), rule('SSN', [25, 36]), rule('IP_ADDRESS', [34, 40])];
      const covered = new Set(detect(text, rules).flatMap((s) => Array.from({ length: s.end - s.start }, (_, i) => s.start + i)));
      for (let i = 0; i < 40; i++) expect(covered.has(i)).toBe(true);
    });

    test('adjacent spans are both kept', () => {
      const spans = detect('x'.repeat(30), [rule('EMAIL', [0, 5]), rule('PHONE', [5, 10])]);
      expect(spans).toHaveLength(2);
    });

    test('same-entity duplicates collapse to one span', () => {
      expect(detect('x'.repeat(30), [rule('EMAIL', [0, 5]), rule('EMAIL', [0, 5])])).toHaveLength(1);
    });
  });

  describe('determinism', () => {
    test('result does not depend on rule order', () => {
      const a = rule('PHONE', [0, 10]);
      const b = rule('CREDIT_CARD', [0, 10]);
      const text = 'x'.repeat(30);
      expect(detect(text, [a, b])).toEqual(detect(text, [b, a]));
    });
  });

  describe('default registry: cross-rule collisions', () => {
    const entities = (text: string) => detect(text).map((s) => `${s.entity}:${text.slice(s.start, s.end)}`);

    test('every entity type is detected with the built-in rules', () => {
      const text = 'a@b.co 123-45-6789 1.2.3.4 4111111111111111 DOB: 1990-05-12 +1-415-555-0134';
      expect(detect(text).map((s) => s.entity)).toEqual(['EMAIL', 'SSN', 'IP_ADDRESS', 'CREDIT_CARD', 'DATE_OF_BIRTH', 'PHONE']);
    });

    test('a card number is one CREDIT_CARD, not phone fragments', () => {
      expect(entities('Card 4111 1111 1111 1111')).toEqual(['CREDIT_CARD:4111 1111 1111 1111']);
      expect(entities('Card 5500000000000004')).toEqual(['CREDIT_CARD:5500000000000004']);
    });

    test('a number failing Luhn is not a card, and not a phone either', () => {
      expect(entities('4111 1111 1111 1112')).toEqual([]);
    });

    test('a bare 9-digit SSN is not a phone', () => {
      expect(entities('SSN 123456789')).toEqual(['SSN:123456789']);
    });

    test('a hyphenated SSN is not a phone', () => {
      expect(entities('SSN 234-56-7890')).toEqual(['SSN:234-56-7890']);
    });

    test('a labelled date is a DOB only; the label stays outside the span', () => {
      expect(entities('DOB: 12/05/1990')).toEqual(['DATE_OF_BIRTH:12/05/1990']);
    });

    test('a phone-shaped number inside a DOB-labelled value does not double-redact', () => {
      expect(entities('DOB: 1990-05-12 call 415-555-0134')).toEqual(['DATE_OF_BIRTH:1990-05-12', 'PHONE:415-555-0134']);
    });

    test('an email wins over the digits in its local part', () => {
      expect(entities('415-555-0134@example.com')).toEqual(['EMAIL:415-555-0134@example.com']);
    });

    test('an IP is not mistaken for a date or phone', () => {
      expect(entities('host 192.168.100.200')).toEqual(['IP_ADDRESS:192.168.100.200']);
    });

    test('the same phone via NANP and + rules yields one span', () => {
      expect(entities('+1-415-555-0134')).toEqual(['PHONE:+1-415-555-0134']);
    });

    test('plain numbers and dates are left alone', () => {
      expect(entities('Order 1700000000 on 2024-10-23 total 12,345.67 v1.2.3 at 10:30')).toEqual([]);
    });
  });
});
