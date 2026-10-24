import { Rule } from '../models/detection';
import { scan } from './scan';

// Hyphenated is format-only. Space-separated and bare forms are validated by the lookaheads:
// area not 000/666/900-999, group not 00, serial not 0000.
const SSN = /(?<!\d)(?:\d{3}-\d{2}-\d{4}|(?!000|666|9)\d{3}( ?)(?!00)\d{2}\1(?!0000)\d{4})(?!\d)/g;

/** US SSN: `ddd-dd-dddd` (format-only), `ddd dd dddd` and `ddddddddd` (validated). */
export const ssnRule: Rule = { entity: 'SSN', find: (text) => scan(text, SSN, 'SSN') };
