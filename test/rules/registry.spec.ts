import { ENTITY_TYPES } from '../../src/models/entity';
import { RULES } from '../../src/rules';
import { BUDGET_MS } from './helpers';

describe('rule registry', () => {
  describe('coverage', () => {
    test('has exactly one rule per entity type', () => {
      expect(RULES.map((r) => r.entity).sort()).toEqual([...ENTITY_TYPES].sort());
    });

    test.each(RULES.map((r) => [r.entity, r] as const))('%s returns only spans of its own entity within bounds', (_e, rule) => {
      const text = 'a@b.co 123-45-6789 1.2.3.4 4111111111111111 DOB: 1990-05-12 +1-415-555-0134';
      for (const span of rule.find(text)) {
        expect(span.entity).toBe(rule.entity);
        expect(span.start).toBeGreaterThanOrEqual(0);
        expect(span.end).toBeLessThanOrEqual(text.length);
        expect(span.end).toBeGreaterThan(span.start);
      }
    });
  });

  describe('performance', () => {
    const inputs: [string, string][] = [
      ['digits', '1'.repeat(1_000_000)],
      ['digits with spaces', '1 '.repeat(500_000)],
      ['digits with hyphens', '1-'.repeat(500_000)],
      ['dots', '1.'.repeat(500_000)],
      ['dotted quads', '1.2.3.4.'.repeat(125_000)],
      ['plus signs', '+1'.repeat(500_000)],
      ['plus digits with spaces', `+${'1 '.repeat(500_000)}`],
      ['parentheses', '(1)'.repeat(333_333)],
      ['labels without dates', 'DOB '.repeat(250_000)],
      ['label then spaces', `DOB${' '.repeat(1_000_000)}`],
      ['label then tabs and colon', `DOB${'\t:'.repeat(300_000)}`],
      ['label then digits', `DOB: ${'1'.repeat(1_000_000)}`],
      ['at signs', '@'.repeat(1_000_000)],
      ['mixed', '4111 1111 1111 111 +1 (415) 555 DOB: 12/ 1.2.3 a@b. '.repeat(20_000)],
    ];

    describe.each(RULES.map((r) => [r.entity, r] as const))('%s', (_e, rule) => {
      test.each(inputs)('linear on adversarial input: %s', (_name, input) => {
        const start = Date.now();
        rule.find(input);
        expect(Date.now() - start).toBeLessThan(BUDGET_MS);
      });
    });
  });
});
