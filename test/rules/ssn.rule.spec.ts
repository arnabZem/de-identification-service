import { ssnRule } from '../../src/rules/ssn.rule';
import { found } from './helpers';

describe('ssnRule', () => {
  describe('detects', () => {
    test.each([
      ['hyphenated', '123-45-6789'],
      ['hyphenated, invalid range (format-only)', '000-12-3456'],
      ['hyphenated, 666 area (format-only)', '666-12-3456'],
      ['hyphenated, 9xx area (format-only)', '987-65-4321'],
      ['space-separated', '123 45 6789'],
      ['bare nine digits', '123456789'],
    ])('%s: %s', (_n, ssn) => {
      expect(found(ssnRule, `SSN ${ssn} on file`)).toEqual([ssn]);
    });

    test('returns exact offsets and entity', () => {
      expect(ssnRule.find('x 123-45-6789')).toEqual([{ start: 2, end: 13, entity: 'SSN' }]);
    });
  });

  describe('rejects', () => {
    test.each([
      ['space form, area 000', '000 12 3456'],
      ['space form, area 666', '666 12 3456'],
      ['space form, area 900+', '900 12 3456'],
      ['space form, group 00', '123 00 6789'],
      ['space form, serial 0000', '123 45 0000'],
      ['bare, area 000', '000123456'],
      ['bare, area 666', '666123456'],
      ['bare, area 9xx', '912345678'],
      ['bare, group 00', '123006789'],
      ['bare, serial 0000', '123450000'],
      ['eight digits', '12345678'],
      ['ten digits', '1234567890'],
      ['wrong hyphen grouping', '1234-56-789'],
      ['double separators', '123--45--6789'],
      ['letters inside', '123-4a-6789'],
    ])('%s: %s', (_n, text) => {
      expect(found(ssnRule, text)).toEqual([]);
    });
  });

  describe('boundaries', () => {
    test.each([
      ['SSN: 123-45-6789.', '123-45-6789'],
      ['(123-45-6789)', '123-45-6789'],
      ['id=123456789;', '123456789'],
      ['a123-45-6789b', '123-45-6789'],
    ])('%s', (text, expected) => {
      expect(found(ssnRule, text)).toEqual([expected]);
    });

    test.each(['1123-45-6789', '123-45-67890', '1234567890', '12345678901234'])('not inside a longer digit run: %s', (text) => {
      expect(found(ssnRule, text)).toEqual([]);
    });

    test('does not match across line breaks', () => {
      expect(found(ssnRule, '123 45\n6789')).toEqual([]);
      expect(found(ssnRule, '123\n45\n6789')).toEqual([]);
    });
  });

  describe('multiple occurrences', () => {
    test('finds every SSN across formats', () => {
      expect(found(ssnRule, '123-45-6789, 234 56 7890\n345678901')).toEqual(['123-45-6789', '234 56 7890', '345678901']);
    });
  });

  describe('unicode', () => {
    test('offsets stay correct after astral characters', () => {
      expect(found(ssnRule, '😀 123-45-6789 😀')).toEqual(['123-45-6789']);
    });
  });
});
