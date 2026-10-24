import { nameRule } from '../../src/rules/name.rule';
import { BUDGET_MS, found } from './helpers';

describe('nameRule', () => {
  describe('detects', () => {
    test.each([
      ['patient name', 'Patient Name: John Doe', 'John Doe'],
      ['bare name label', 'Name: John Doe', 'John Doe'],
      ['patient label', 'Patient: John Doe', 'John Doe'],
      ['full name', 'Full Name: John Doe', 'John Doe'],
      ['first name', 'First Name: John', 'John'],
      ['last name', 'Last Name: Doe', 'Doe'],
      ['middle initial', 'Name: John Q. Public', 'John Q. Public'],
      ['last, first', 'Name: Doe, John', 'Doe, John'],
      ['title', 'Name: Dr. Jane Roe', 'Dr. Jane Roe'],
      ['apostrophe and hyphen', "Name: Mary O'Brien-Smith", "Mary O'Brien-Smith"],
      ['all caps', 'PATIENT NAME: JOHN DOE', 'JOHN DOE'],
      ['Unicode', 'Patient: José Álvarez-Núñez', 'José Álvarez-Núñez'],
      ['space before colon', 'Name : John Doe', 'John Doe'],
      ['tab after colon', 'Name:\tJohn Doe', 'John Doe'],
    ])('%s', (_n, text, name) => {
      expect(found(nameRule, text)).toEqual([name]);
    });

    test.each(['patient name: John', 'PATIENT NAME: John', 'Patient name: John', 'pAtIeNt: John'])('label is case-insensitive: %s', (text) => {
      expect(found(nameRule, text)).toEqual(['John']);
    });
  });

  describe('boundaries', () => {
    test.each([
      ['lowercase word', 'Name: John Doe was admitted', 'John Doe'],
      ['next label after comma', 'Patient Name: John Doe, DOB: 1990-05-12', 'John Doe'],
      ['next label without comma', 'Name: John Doe Age: 45', 'John Doe'],
      ['sentence period', 'Name: John Doe.', 'John Doe'],
      ['five words at most', 'Name: A B C D E F', 'A B C D E'],
    ])('stops at %s', (_n, text, name) => {
      expect(found(nameRule, text)).toEqual([name]);
    });

    test('redacts only the name, not the label', () => {
      const text = 'Patient Name: John Doe';
      expect(nameRule.find(text)).toEqual([{ start: 14, end: 22, entity: 'NAME' }]);
    });

    test('finds multiple labeled names', () => {
      expect(found(nameRule, 'First Name: John\nLast Name: Doe')).toEqual(['John', 'Doe']);
    });
  });

  describe('ignores', () => {
    test.each([
      ['unlabeled name (problem statement)', 'Patient John Doe can be contacted'],
      ['label without colon', 'Patient Name John Doe'],
      ['lowercase value', 'Name: john doe'],
      ['value on the next line', 'Name:\nJohn Doe'],
      ['empty value', 'Name: '],
      ['label inside a word', 'username: Bob'],
      ['label inside a word (filename)', 'filename: Report'],
      ['label preceded by a digit', '1name: Bob'],
      ['value that is the next label', 'Name: DOB: 1990-05-12'],
    ])('%s', (_n, text) => {
      expect(found(nameRule, text)).toEqual([]);
    });
  });

  describe('performance', () => {
    test.each([
      ['repeated label and initial', 'Name: A '.repeat(125_000)],
      ['label then spaces', `Name:${' '.repeat(1_000_000)}`],
      ['label then many words', `Name: ${'Ab '.repeat(333_333)}`],
      ['chained labels', 'Name: Age: '.repeat(90_000)],
      ['one long word', `Name: ${'A'.repeat(1_000_000)}`],
      ['labels without colon', 'patient '.repeat(125_000)],
    ])('linear on %s', (_n, text) => {
      const start = Date.now();
      nameRule.find(text);
      expect(Date.now() - start).toBeLessThan(BUDGET_MS);
    });
  });
});
