import { Rule } from '../models/detection';
import { scan } from './scan';

const W = '\\p{L}\\p{M}\\p{N}';
// The lookbehind keeps matching linear; leading punctuation is trimmed in find().
const EMAIL = new RegExp(`(?<![${W}._%+-])[${W}._%+-]+@(?:[${W}-]+\\.)+\\p{L}[${W}-]*\\p{L}`, 'gu');
const ALNUM = /[\p{L}\p{M}\p{N}]/u;

/** Unicode-aware EMAIL rule: `local@domain.tld` with a dotted domain and a TLD of 2+ letters. */
export const emailRule: Rule = {
  entity: 'EMAIL',
  find: (text) =>
    scan(text, EMAIL, 'EMAIL', (m) => {
      const lead = m[0].search(ALNUM);
      return lead < 0 || lead > m[0].indexOf('@') ? null : [m.index + lead, m.index + m[0].length];
    }),
};
