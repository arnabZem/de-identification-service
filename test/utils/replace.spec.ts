import { Span } from '../../src/models/entity';
import { replace } from '../../src/utils/replace';

const span = (start: number, end: number, entity: Span['entity'] = 'EMAIL'): Span => ({ start, end, entity });

describe('replace', () => {
  describe('replacement', () => {
    test('swaps a span for its [ENTITY] placeholder', () => {
      expect(replace('Mail a@b.co now', [span(5, 11)]).text).toBe('Mail [EMAIL] now');
    });

    test('uses the placeholder of each span entity', () => {
      const result = replace('AAA BBB', [span(0, 3, 'SSN'), span(4, 7, 'PHONE')]);
      expect(result.text).toBe('[SSN] [PHONE]');
    });

    test('handles multiple spans in one pass', () => {
      expect(replace('a b c', [span(0, 1), span(2, 3), span(4, 5)]).text).toBe('[EMAIL] [EMAIL] [EMAIL]');
    });
  });

  describe('counts', () => {
    test('counts replacements per entity', () => {
      const result = replace('a b c', [span(0, 1), span(2, 3), span(4, 5, 'PHONE')]);
      expect(result.counts).toEqual({ EMAIL: 2, PHONE: 1 });
    });

    test('is empty when nothing is replaced', () => {
      expect(replace('abc', []).counts).toEqual({});
    });
  });

  describe('preservation', () => {
    test('returns identical text when there are no spans', () => {
      const text = 'Zoë 😀 e\u0301\r\nline two\u00a0end';
      expect(replace(text, []).text).toBe(text);
    });

    test('keeps surrounding Unicode, CRLF and whitespace untouched', () => {
      const text = '😀 a@b.co\r\n\u00a0é';
      expect(replace(text, [span(3, 9)]).text).toBe('😀 [EMAIL]\r\n\u00a0é');
    });
  });

  describe('edge spans', () => {
    test('span at the very start', () => {
      expect(replace('abc def', [span(0, 3)]).text).toBe('[EMAIL] def');
    });

    test('span at the very end', () => {
      expect(replace('abc def', [span(4, 7)]).text).toBe('abc [EMAIL]');
    });

    test('span covering the whole text', () => {
      expect(replace('abc', [span(0, 3)]).text).toBe('[EMAIL]');
    });

    test('adjacent spans', () => {
      expect(replace('abcdef', [span(0, 3), span(3, 6, 'PHONE')]).text).toBe('[EMAIL][PHONE]');
    });

    test('empty text', () => {
      expect(replace('', [])).toEqual({ text: '', counts: {} });
    });
  });
});
