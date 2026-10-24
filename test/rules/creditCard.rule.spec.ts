import { creditCardRule, luhn } from '../../src/rules/creditCard.rule';
import { found } from './helpers';

describe('luhn', () => {
  test.each(['4111111111111111', '5500000000000004', '378282246310005', '6011111111111117', '4222222222222', '0000000000000000'])('valid: %s', (n) => {
    expect(luhn(n)).toBe(true);
  });

  test.each(['4111111111111112', '1234567812345678', '5500000000000005'])('invalid: %s', (n) => {
    expect(luhn(n)).toBe(false);
  });
});

describe('creditCardRule', () => {
  describe('detects', () => {
    test.each([
      ['Visa, spaced', '4111 1111 1111 1111'],
      ['Visa, hyphenated', '4111-1111-1111-1111'],
      ['Visa, bare', '4111111111111111'],
      ['Mastercard, bare', '5500000000000004'],
      ['Amex, 4-6-5 spaced', '3782 822463 10005'],
      ['Amex, 4-6-5 hyphenated', '3782-822463-10005'],
      ['Amex, bare', '378282246310005'],
      ['Diners, 4-6-4', '3056 930902 5904'],
      ['13-digit Visa', '4222222222222'],
      ['19-digit, spaced 4-4-4-4-3', '6304 0000 0000 0000 000'],
    ])('%s: %s', (_n, card) => {
      expect(found(creditCardRule, `Card ${card} exp`)).toEqual([card]);
    });

    test('returns exact offsets and entity', () => {
      expect(creditCardRule.find('x 4111111111111111')).toEqual([{ start: 2, end: 18, entity: 'CREDIT_CARD' }]);
    });
  });

  describe('rejects', () => {
    test.each([
      ['fails Luhn, bare', '4111111111111112'],
      ['fails Luhn, spaced', '4111 1111 1111 1112'],
      ['twelve digits', '411111111111'],
      ['twenty digits, bare', '41111111111111111111'],
      ['mixed separators', '4111 1111-1111 1111'],
      ['double spaces', '4111  1111  1111  1111'],
      ['unusual grouping', '41111 11111 11111 1'],
      ['letters inside', '4111 1111 1111 111a'],
    ])('%s: %s', (_n, text) => {
      expect(found(creditCardRule, text)).toEqual([]);
    });

    test('unrelated space-separated numbers are not joined into a card', () => {
      expect(found(creditCardRule, '555-0134 020 7946 0958')).toEqual([]);
      expect(found(creditCardRule, '123 45 6789 123456789')).toEqual([]);
    });
  });

  describe('boundaries', () => {
    test.each([
      ['Card: 4111111111111111.', '4111111111111111'],
      ['(4111 1111 1111 1111)', '4111 1111 1111 1111'],
      ['4111111111111111, exp 12/25', '4111111111111111'],
      ['no=4111-1111-1111-1111;', '4111-1111-1111-1111'],
    ])('%s', (text, expected) => {
      expect(found(creditCardRule, text)).toEqual([expected]);
    });

    test('finds a valid card after a preceding number', () => {
      expect(found(creditCardRule, 'order 12 4111 1111 1111 1111')).toEqual(['4111 1111 1111 1111']);
    });

    test('does not match across line breaks', () => {
      expect(found(creditCardRule, '4111 1111\n1111 1111')).toEqual([]);
    });
  });

  describe('multiple occurrences', () => {
    test('finds every card across formats', () => {
      expect(found(creditCardRule, '4111111111111111 and 5500-0000-0000-0004\n3782 822463 10005')).toEqual([
        '4111111111111111',
        '5500-0000-0000-0004',
        '3782 822463 10005',
      ]);
    });
  });

  describe('unicode', () => {
    test('offsets stay correct after astral characters', () => {
      expect(found(creditCardRule, '😀 4111111111111111 😀')).toEqual(['4111111111111111']);
    });
  });
});
