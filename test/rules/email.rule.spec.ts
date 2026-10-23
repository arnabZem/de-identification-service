import { emailRule } from '../../src/rules/email.rule';

const found = (text: string) => emailRule.find(text).map((s) => text.slice(s.start, s.end));

describe('emailRule', () => {
  describe('detects', () => {
    test.each([
      'john.doe@example.com',
      'john.doe+tag@example.com',
      'first_last%x@sub.example.co.uk',
      'user123@example-domain.org',
      'JOHN@EXAMPLE.COM',
      'a@b.io',
      'user@example.xn--p1ai',
    ])('ASCII: %s', (email) => {
      expect(found(`Contact ${email} now`)).toEqual([email]);
    });

    test.each([
      'josé@exämple.com',
      'пользователь@пример.рф',
      '用户@例子.中国',
      'jose\u0301@example.com',
    ])('Unicode: %s', (email) => {
      expect(found(`Contact ${email} now`)).toEqual([email]);
    });

    test('returns exact span offsets and entity', () => {
      expect(emailRule.find('Hi a@b.co')).toEqual([{ start: 3, end: 9, entity: 'EMAIL' }]);
    });
  });

  describe('rejects', () => {
    test.each([
      'no email here',
      'john@localhost',
      'a@b',
      'user@',
      '@example.com',
      'user@.com',
      'user@example.c',
      'user @example.com',
      'john@',
      '...@example.com',
    ])('%s', (text) => {
      expect(found(text)).toEqual([]);
    });
  });

  describe('boundaries', () => {
    test.each([
      ['Mail john@example.com.', 'john@example.com'],
      ['Mail john@example.com, please', 'john@example.com'],
      ['(john@example.com)', 'john@example.com'],
      ['<john@example.com>', 'john@example.com'],
      ['"john@example.com"', 'john@example.com'],
      ['mailto:john@example.com', 'john@example.com'],
      ['email:john@example.com', 'john@example.com'],
      ['-john@example.com', 'john@example.com'],
      ['..john@example.com', 'john@example.com'],
    ])('%s', (text, expected) => {
      expect(found(text)).toEqual([expected]);
    });

    test('does not match across line breaks', () => {
      expect(found('john@\nexample.com')).toEqual([]);
      expect(found('john\n@example.com')).toEqual([]);
    });

    test('keeps the valid half of a doubled @', () => {
      expect(found('x@y@z.com')).toEqual(['y@z.com']);
    });
  });

  describe('multiple occurrences', () => {
    test('finds every email, including repeats', () => {
      expect(found('a@x.com, b@y.org; a@x.com\nc@z.net')).toEqual(['a@x.com', 'b@y.org', 'a@x.com', 'c@z.net']);
    });
  });

  describe('unicode offsets', () => {
    test('offsets stay correct after astral characters', () => {
      expect(found('😀 a@b.co 😀')).toEqual(['a@b.co']);
    });
  });

  describe('performance', () => {
    test.each([
      ['dotted local part, no @', 'a.'.repeat(500_000)],
      ['long local part, no @', 'a'.repeat(1_000_000)],
      ['repeated @', 'a@'.repeat(500_000)],
      ['unterminated domain', `a@${'a.'.repeat(500_000)}`],
    ])('linear on adversarial input: %s', (_name, input) => {
      const start = Date.now();
      emailRule.find(input);
      expect(Date.now() - start).toBeLessThan(1000);
    });
  });
});
