import { phoneRule } from '../../src/rules/phone.rule';
import { found } from './helpers';

describe('phoneRule', () => {
  describe('detects', () => {
    test.each([
      ['+ country code, hyphens', '+1-415-555-0134'],
      ['+1, spaces', '+1 415 555 0134'],
      ['+1, parentheses', '+1 (415) 555-0134'],
      ['+1, bare', '+14155550134'],
      ['+44 UK', '+44 20 7946 0958'],
      ['+91 India', '+91 98765 43210'],
      ['+49 Germany, dots', '+49.30.123456'],
      ['+33 France', '+33 1 23 45 67 89'],
      ['NANP, parentheses', '(415) 555-0134'],
      ['NANP, no space after parentheses', '(415)555-0134'],
      ['NANP, hyphens', '415-555-0134'],
      ['NANP, dots', '415.555.0134'],
      ['NANP, spaces', '415 555 0134'],
      ['NANP, bare', '4155550134'],
      ['NANP, leading 1', '14155550134'],
      ['NANP, leading 1 and hyphens', '1-415-555-0134'],
    ])('%s: %s', (_n, phone) => {
      expect(found(phoneRule, `Call ${phone} today`)).toEqual([phone]);
    });

    test('returns exact offsets and entity', () => {
      expect(phoneRule.find('tel +1-415-555-0134')).toEqual([{ start: 4, end: 19, entity: 'PHONE' }]);
    });

    test('accepts 8 and 15 total digits with +', () => {
      expect(found(phoneRule, '+12345678')).toEqual(['+12345678']);
      expect(found(phoneRule, '+123456789012345')).toEqual(['+123456789012345']);
    });
  });

  describe('rejects', () => {
    test.each([
      ['local 7-digit', '555-0134'],
      ['non-US without +', '020 7946 0958'],
      ['area code starting with 1', '123-456-7890'],
      ['area code starting with 0', '015-555-0134'],
      ['exchange starting with 1', '415-155-0134'],
      ['ten digits starting with 1 (timestamp-like)', '1700000000'],
      ['nine digits', '415555013'],
      ['eleven digits not starting with 1', '24155550134'],
      ['+ with 7 digits', '+1234567'],
      ['+ with 16 digits', '+1234567890123456'],
      ['+0 country code', '+0123456789'],
      ['dates', '2024-10-23'],
      ['letters', '415-555-01a4'],
    ])('%s: %s', (_n, text) => {
      expect(found(phoneRule, text)).toEqual([]);
    });
  });

  describe('boundaries', () => {
    test.each([
      ['Call +1-415-555-0134.', '+1-415-555-0134'],
      ['(+1-415-555-0134)', '+1-415-555-0134'],
      ['Tel:415-555-0134,', '415-555-0134'],
      ['"415.555.0134"', '415.555.0134'],
    ])('%s', (text, expected) => {
      expect(found(phoneRule, text)).toEqual([expected]);
    });

    test.each(['94155550134', '41555501345', '4155550134567'])('not inside a longer digit run: %s', (text) => {
      expect(found(phoneRule, text)).toEqual([]);
    });

    test('does not match across line breaks', () => {
      expect(found(phoneRule, '415-555\n0134')).toEqual([]);
      expect(found(phoneRule, '+1 415\n555 0134')).toEqual([]);
    });
  });

  describe('multiple occurrences', () => {
    test('finds every phone across formats', () => {
      expect(found(phoneRule, '415-555-0134, (212) 555-0199\n+44 20 7946 0958 and 415-555-0134')).toEqual([
        '415-555-0134',
        '(212) 555-0199',
        '+44 20 7946 0958',
        '415-555-0134',
      ]);
    });
  });

  describe('unicode', () => {
    test('offsets stay correct after astral characters', () => {
      expect(found(phoneRule, '😀 415-555-0134 😀')).toEqual(['415-555-0134']);
    });
  });
});

describe('phoneRule: Unicode separators', () => {
  test.each([
    ['no-break spaces', '415\u00a0555\u00a00134'],
    ['en dashes', '415\u2013555\u20130134'],
    ['non-breaking hyphens', '415\u2011555\u20110134'],
    ['narrow no-break space after area code', '(415)\u202f555-0134'],
    ['international with no-break spaces', '+44\u00a020\u00a07946\u00a00958'],
    ['international with figure dashes', '+1\u2012415\u2012555\u20120134'],
  ])('%s', (_n, text) => {
    expect(found(phoneRule, `call ${text} now`)).toEqual([text]);
  });
});
