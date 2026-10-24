import { Rule } from '../models/detection';
import { scan } from './scan';

// Separator between digits: optional ")", one of " .-", optional "(". Each string parses one way (no backtracking blowup).
const SEP = '\\)?[ .-]?\\(?';
const INTERNATIONAL = `\\+[1-9](?:${SEP}\\d){7,14}`; // + country code, 8-15 digits total
const NANP = '(?:\\+?1[ .-]?)?(?:\\([2-9]\\d\\d\\)[ .-]?|[2-9]\\d\\d[ .-]?)[2-9]\\d\\d[ .-]?\\d{4}';
const PHONE = new RegExp(`(?<!\\d)(?:${INTERNATIONAL}|${NANP})(?!\\d)`, 'g');

/** Phone numbers: `+<country code>` (8-15 digits) or NANP (10 digits, optional leading 1 / +1). */
export const phoneRule: Rule = { entity: 'PHONE', find: (text) => scan(text, PHONE, 'PHONE') };
