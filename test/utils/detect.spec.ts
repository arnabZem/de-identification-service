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

    test('partially overlapping spans: only the winner is kept', () => {
      const spans = detect('x'.repeat(30), [rule('PHONE', [0, 10]), rule('EMAIL', [8, 22])]);
      expect(spans).toEqual<Span[]>([{ start: 8, end: 22, entity: 'EMAIL' }]);
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

  describe('default registry', () => {
    test('detects emails with the built-in rules', () => {
      expect(detect('Mail a@b.co')).toEqual<Span[]>([{ start: 5, end: 11, entity: 'EMAIL' }]);
    });
  });
});
