import { dobRule } from '../../src/rules/dob.rule';
import { found } from './helpers';

describe('dobRule', () => {
  describe('detects', () => {
    test.each([
      ['ISO', 'DOB: 1990-05-12', '1990-05-12'],
      ['year first, slashes', 'DOB: 1990/05/12', '1990/05/12'],
      ['year first, short parts', 'DOB: 1990-5-2', '1990-5-2'],
      ['MM/DD/YYYY', 'DOB: 05/12/1990', '05/12/1990'],
      ['DD/MM/YYYY', 'DOB: 31/12/1990', '31/12/1990'],
      ['dotted', 'DOB: 12.05.1990', '12.05.1990'],
      ['hyphenated day-first', 'DOB: 12-05-1990', '12-05-1990'],
      ['month name first', 'DOB: May 12, 1990', 'May 12, 1990'],
      ['month name, no comma', 'DOB: May 12 1990', 'May 12 1990'],
      ['day first with month name', 'DOB: 12 May 1990', '12 May 1990'],
      ['short month', 'DOB: Sep 3, 1985', 'Sep 3, 1985'],
      ['short month with period', 'DOB: Sept. 3, 1985', 'Sept. 3, 1985'],
      ['full month', 'DOB: December 31, 2001', 'December 31, 2001'],
      ['leap day', 'DOB: 2000-02-29', '2000-02-29'],
    ])('%s', (_n, text, date) => {
      expect(found(dobRule, text)).toEqual([date]);
    });

    test.each([
      'DOB: 1990-05-12',
      'dob: 1990-05-12',
      'D.O.B. 1990-05-12',
      'D.O.B: 1990-05-12',
      'Date of birth: 1990-05-12',
      'DATE OF BIRTH 1990-05-12',
      'Date  of  Birth - 1990-05-12',
      'Birth date: 1990-05-12',
      'Birthdate: 1990-05-12',
      'dob is 1990-05-12',
      'DOB 1990-05-12',
      'DOB:1990-05-12',
      'DOB :   1990-05-12',
      'Patient (DOB: 1990-05-12)',
    ])('label variant: %s', (text) => {
      expect(found(dobRule, text)).toEqual(['1990-05-12']);
    });

    test('redacts only the date, leaving the label', () => {
      expect(dobRule.find('DOB: 1990-05-12')).toEqual([{ start: 5, end: 15, entity: 'DATE_OF_BIRTH' }]);
    });
  });

  describe('rejects', () => {
    test.each([
      ['no label', 'born 1990-05-12'],
      ['unrelated label', 'Appointment: 1990-05-12'],
      ['date alone', '1990-05-12'],
      ['label without a date', 'DOB: unknown'],
      ['Feb 30', 'DOB: 1990-02-31'],
      ['non-leap Feb 29', 'DOB: 1990-02-29'],
      ['month 13 either order', 'DOB: 13/13/1990'],
      ['day 32', 'DOB: 05/32/1990'],
      ['month name with day 31 in 30-day month', 'DOB: Apr 31, 1990'],
      ['two-digit year', 'DOB: 5/12/90'],
      ['year before 1900', 'DOB: 1899-12-31'],
      ['year after 2099', 'DOB: 2100-01-01'],
      ['label inside a word', 'Adobe 1990-05-12'],
      ['label in a longer word', 'MYDOB: 1990-05-12'],
      ['date glued to extra digits', 'DOB: 1990-05-123'],
      ['label and date on different lines', 'DOB:\n1990-05-12'],
      ['label, blank line, date', 'Date of birth\n\n1990-05-12'],
    ])('%s: %s', (_n, text) => {
      expect(found(dobRule, text)).toEqual([]);
    });
  });

  describe('day/month order', () => {
    test.each(['05/12/1990', '12/05/1990', '31/12/1990', '12/31/1990'])('accepts %s (valid in at least one order)', (date) => {
      expect(found(dobRule, `DOB: ${date}`)).toEqual([date]);
    });
  });

  describe('multiple occurrences', () => {
    test('finds every labelled date', () => {
      expect(found(dobRule, 'DOB: 1990-05-12\nDate of birth: 12/05/1985; DOB: May 1, 2000')).toEqual(['1990-05-12', '12/05/1985', 'May 1, 2000']);
    });

    test('an invalid date does not hide a later valid one', () => {
      expect(found(dobRule, 'DOB: 1990-02-31 DOB: 1990-05-12')).toEqual(['1990-05-12']);
    });
  });

  describe('unicode', () => {
    test('offsets stay correct after astral characters', () => {
      expect(found(dobRule, '😀 DOB: 1990-05-12 😀')).toEqual(['1990-05-12']);
    });

    test('label preceded by non-ASCII punctuation still matches', () => {
      expect(found(dobRule, '«DOB: 1990-05-12»')).toEqual(['1990-05-12']);
    });

    test('label glued to a Unicode letter does not match', () => {
      expect(found(dobRule, 'éDOB: 1990-05-12')).toEqual([]);
    });
  });
});

describe('dobRule: Unicode separators and glued labels', () => {
  test.each([
    ['no-break space after label', 'DOB:\u00a01990-05-12', '1990-05-12'],
    ['no-break spaces in label', 'Date\u00a0of\u00a0birth: 1990-05-12', '1990-05-12'],
    ['en dashes in date', 'DOB: 1990\u201305\u201312', '1990\u201305\u201312'],
    ['no-break spaces in month-name date', 'DOB: May\u00a012,\u00a01990', 'May\u00a012,\u00a01990'],
    ['label glued to a preceding digit', 'id 12DOB: 1990-05-12', '1990-05-12'],
  ])('%s', (_n, text, date) => {
    expect(found(dobRule, text)).toEqual([date]);
  });

  test('a label inside a word is still ignored', () => {
    expect(found(dobRule, 'ADOBE: 1990-05-12')).toEqual([]);
  });
});
