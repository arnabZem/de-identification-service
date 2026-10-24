import { Rule } from '../models/detection';
import { scan } from './scan';

// Hyphenated is format-only; space-separated and bare forms are validated (see isValid).
const SSN = /(?<!\d)(?:\d{3}-\d{2}-\d{4}|\d{3} \d{2} \d{4}|\d{9})(?!\d)/g;

/** Area not 000/666/900-999, group not 00, serial not 0000. */
function isValid(digits: string): boolean {
  const area = Number(digits.slice(0, 3));
  return area !== 0 && area !== 666 && area < 900 && digits.slice(3, 5) !== '00' && digits.slice(5) !== '0000';
}

/** US SSN: `ddd-dd-dddd` (format-only), `ddd dd dddd` and `ddddddddd` (validated). */
export const ssnRule: Rule = {
  entity: 'SSN',
  find: (text) => scan(text, SSN, 'SSN', (m) => (m[0].includes('-') || isValid(m[0].replace(/ /g, '')) ? [m.index, m.index + m[0].length] : null)),
};
