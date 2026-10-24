import { Rule } from '../models/detection';
import { scan } from './scan';

// Common layouts only, with one consistent separator: bare 13-19 digits, 4-4-4-4(-1..3), 4-6-5 (Amex), 4-6-4. Luhn-checked afterwards.
const CARD = /(?<!\d)(?:\d{13,19}|\d{4}([ -])\d{4}\1\d{4}\1\d{4}(?:\1\d{1,3})?|\d{4}([ -])\d{6}\2\d{4,5})(?!\d)/g;

/** Luhn checksum over a digit string. */
export function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) {
    let d = digits.charCodeAt(i) - 48;
    if (double && (d *= 2) > 9) d -= 9;
    sum += d;
  }
  return sum % 10 === 0;
}

const passes = (s: string) => luhn(s.replace(/\D/g, ''));

/** Credit card numbers: 13-19 digits, optionally grouped, passing Luhn. Falls back to the first four groups (card followed by CVV/expiry). */
export const creditCardRule: Rule = {
  entity: 'CREDIT_CARD',
  find: (text) =>
    scan(text, CARD, 'CREDIT_CARD', (m) => {
      if (passes(m[0])) return [m.index, m.index + m[0].length];
      // Group 1 is set only for the 4-4-4-4 layout, whose first four groups are 19 characters.
      return m[1] && passes(m[0].slice(0, 19)) ? [m.index, m.index + 19] : null;
    }),
};
