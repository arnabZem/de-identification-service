import { Rule } from '../models/detection';
import { scan } from './scan';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
const DATE = [
  '\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}', // 1990-05-12
  '\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{4}', // 05/12/1990 or 12/05/1990
  `${MONTH}[ \\t]+\\d{1,2},?[ \\t]+\\d{4}`, // May 12, 1990
  `\\d{1,2}[ \\t]+${MONTH},?[ \\t]+\\d{4}`, // 12 May 1990
].join('|');
const LABEL = '(?:D\\.?O\\.?B\\.?|date[ \\t]+of[ \\t]+birth|birth[ \\t]?date)';
// Label, optional ":" / "-" / "is", then the date (captured as `date`). Spacing is parsed one way only.
const DOB = new RegExp(`(?<![\\p{L}\\p{N}])${LABEL}[ \\t]*(?:(?::|-|is)[ \\t]*)?(?<date>${DATE})(?!\\d)`, 'giud');

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const isValid = (year: number, month: number, day: number) =>
  year >= 1900 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= daysIn(year, month);

/** True for a real calendar date in 1900-2099; numeric forms are accepted in either day/month order. */
function isValidDate(date: string): boolean {
  const nums = date.match(/\d+/g)!.map(Number);
  const month = MONTHS.indexOf(date.replace(/[^a-z]/gi, '').slice(0, 3).toLowerCase()) + 1;
  if (month) return isValid(nums[1]!, month, nums[0]!); // "May 12, 1990" / "12 May 1990"
  const [year, x, y] = /^\d{4}/.test(date) ? nums : [nums[2]!, nums[0]!, nums[1]!];
  return isValid(year!, x!, y!) || isValid(year!, y!, x!);
}

/** DATE_OF_BIRTH: a date after an explicit DOB label on the same line. Only the date is redacted; the label stays. */
export const dobRule: Rule = {
  entity: 'DATE_OF_BIRTH',
  find: (text) =>
    scan(text, DOB, 'DATE_OF_BIRTH', (m) => {
      const range = m.indices!.groups!.date!;
      return isValidDate(m.groups!.date!) ? [range[0], range[1]] : null;
    }),
};
