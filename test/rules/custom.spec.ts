import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCustomRules } from '../../src/rules/custom';
import { found } from './helpers';

const dir = mkdtempSync(join(tmpdir(), 'custom-rules-'));
let n = 0;
/** Writes `content` (JSON-encoded unless already a string) to a temp file and returns its path. */
const file = (content: unknown) => {
  const path = join(dir, `rules-${n++}.json`);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  return path;
};
const load = (defs: unknown) => loadCustomRules(file(defs));

describe('loadCustomRules', () => {
  describe('loading', () => {
    test.each([undefined, ''])('returns no rules without a file: %j', (path) => {
      expect(loadCustomRules(path)).toEqual([]);
    });

    test('returns no rules for an empty array', () => {
      expect(load([])).toEqual([]);
    });

    test('builds one rule per entry, in file order', () => {
      const rules = load([
        { entity: 'MRN', pattern: 'MRN-\\d{6}' },
        { entity: 'EMPLOYEE_ID', pattern: 'E\\d{5}' },
      ]);
      expect(rules.map((r) => r.entity)).toEqual(['MRN', 'EMPLOYEE_ID']);
    });
  });

  describe('matching', () => {
    test('finds every match of the pattern', () => {
      const [rule] = load([{ entity: 'MRN', pattern: 'MRN-\\d{6}' }]);
      expect(found(rule!, 'MRN-123456 and MRN-654321')).toEqual(['MRN-123456', 'MRN-654321']);
    });

    test('redacts only the `value` group when present', () => {
      const [rule] = load([{ entity: 'MRN', pattern: 'MRN:\\s*(?<value>\\d{6})' }]);
      expect(found(rule!, 'MRN: 123456')).toEqual(['123456']);
    });

    test('falls back to the whole match when the `value` group did not participate', () => {
      const [rule] = load([{ entity: 'MRN', pattern: 'MRN(?::(?<value>\\d+))?' }]);
      expect(found(rule!, 'MRN MRN:42')).toEqual(['MRN', '42']);
    });

    test('applies user flags', () => {
      const [rule] = load([{ entity: 'MRN', pattern: 'mrn-\\d+', flags: 'i' }]);
      expect(found(rule!, 'MRN-1 mrn-2')).toEqual(['MRN-1', 'mrn-2']);
    });

    test('supports Unicode patterns with the u flag', () => {
      const [rule] = load([{ entity: 'CODE', pattern: '\\p{Lu}{3}-\\d+', flags: 'u' }]);
      expect(found(rule!, 'ÄÖÜ-7')).toEqual(['ÄÖÜ-7']);
    });

    test.each(['g', 'y', 'd', 'gyd'])('ignores flag %j (the rule always scans globally)', (flags) => {
      const [rule] = load([{ entity: 'MRN', pattern: 'X\\d', flags }]);
      expect(found(rule!, 'X1 X2')).toEqual(['X1', 'X2']);
    });

    test('skips empty matches without hanging', () => {
      const [rule] = load([{ entity: 'DIGITS', pattern: '\\d*' }]);
      expect(found(rule!, 'a12b3')).toEqual(['12', '3']);
    });

    test('is reusable across calls', () => {
      const [rule] = load([{ entity: 'MRN', pattern: 'X\\d' }]);
      expect(found(rule!, 'X1')).toEqual(['X1']);
      expect(found(rule!, 'X2')).toEqual(['X2']);
    });

    test('returns spans tagged with the custom entity', () => {
      const [rule] = load([{ entity: 'MRN', pattern: 'X\\d' }]);
      expect(rule!.find('a X1')).toEqual([{ start: 2, end: 4, entity: 'MRN' }]);
    });
  });

  describe('rejects', () => {
    test.each([
      ['not an array', { entity: 'MRN', pattern: 'x' }, 'file must contain a JSON array'],
      ['a null entry', [null], 'entity must be UPPER_SNAKE_CASE'],
      ['a missing entity', [{ pattern: 'x' }], 'entity must be UPPER_SNAKE_CASE'],
      ['a lowercase entity', [{ entity: 'mrn', pattern: 'x' }], 'entity must be UPPER_SNAKE_CASE'],
      ['an entity starting with a digit', [{ entity: '1MRN', pattern: 'x' }], 'entity must be UPPER_SNAKE_CASE'],
      ['a built-in entity', [{ entity: 'EMAIL', pattern: 'x' }], 'entity EMAIL is already defined'],
      ['a duplicate entity', [{ entity: 'MRN', pattern: 'x' }, { entity: 'MRN', pattern: 'y' }], 'Custom rule 1: entity MRN is already defined'],
      ['a missing pattern', [{ entity: 'MRN' }], 'pattern and flags must be strings'],
      ['an empty pattern', [{ entity: 'MRN', pattern: '' }], 'pattern and flags must be strings'],
      ['non-string flags', [{ entity: 'MRN', pattern: 'x', flags: 1 }], 'pattern and flags must be strings'],
      ['an invalid pattern', [{ entity: 'MRN', pattern: '(' }], 'Custom rule 0 (MRN): Invalid regular expression'],
      ['an invalid flag', [{ entity: 'MRN', pattern: 'x', flags: 'z' }], 'Custom rule 0 (MRN): Invalid flags'],
    ])('%s', (_n, defs, message) => {
      expect(() => load(defs)).toThrow(message);
    });

    test('malformed JSON', () => {
      expect(() => loadCustomRules(file('[{'))).toThrow(SyntaxError);
    });

    test('a missing file', () => {
      expect(() => loadCustomRules(join(dir, 'missing.json'))).toThrow(/ENOENT/);
    });
  });
});
