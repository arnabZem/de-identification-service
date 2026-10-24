import { scan } from '../../src/rules/scan';

describe('scan', () => {
  describe('matching', () => {
    test('returns a span per match with the given entity', () => {
      expect(scan('a1 b22', /\d+/g, 'SSN')).toEqual([
        { start: 1, end: 2, entity: 'SSN' },
        { start: 4, end: 6, entity: 'SSN' },
      ]);
    });

    test('returns nothing when there is no match', () => {
      expect(scan('abc', /\d+/g, 'SSN')).toEqual([]);
    });

    test('is repeatable: lastIndex state does not leak between calls', () => {
      const pattern = /\d+/g;
      expect(scan('1 2', pattern, 'SSN')).toHaveLength(2);
      expect(scan('1 2', pattern, 'SSN')).toHaveLength(2);
    });
  });

  describe('accept callback', () => {
    test('can narrow the span', () => {
      expect(scan('x123', /x\d+/g, 'SSN', (m) => [m.index + 1, m.index + m[0].length])).toEqual([{ start: 1, end: 4, entity: 'SSN' }]);
    });

    test('can reject a match', () => {
      expect(scan('1 2', /\d/g, 'SSN', (m) => (m[0] === '1' ? null : [m.index, m.index + 1]))).toEqual([{ start: 2, end: 3, entity: 'SSN' }]);
    });

    test('resumes one character after a rejection to find a match hidden inside it', () => {
      const spans = scan('ab', /(?:ab|b)/g, 'SSN', (m) => (m[0] === 'ab' ? null : [m.index, m.index + 1]));
      expect(spans).toEqual([{ start: 1, end: 2, entity: 'SSN' }]);
    });
  });
});
