import { Rule } from '../models/detection';
import { Span } from '../models/entity';

const W = '\\p{L}\\p{M}\\p{N}';
// The lookbehind keeps matching linear; leading punctuation is trimmed in find().
const EMAIL = new RegExp(`(?<![${W}._%+-])[${W}._%+-]+@(?:[${W}-]+\\.)+\\p{L}[${W}-]*\\p{L}`, 'gu');
const ALNUM = /[\p{L}\p{M}\p{N}]/u;

/** Unicode-aware EMAIL rule: `local@domain.tld` with a dotted domain and a TLD of 2+ letters. */
export const emailRule: Rule = {
  entity: 'EMAIL',
  find(text: string): Span[] {
    const spans: Span[] = [];
    for (const match of text.matchAll(EMAIL)) {
      const lead = match[0].search(ALNUM);
      if (lead < 0 || lead > match[0].indexOf('@')) continue;
      spans.push({ start: match.index + lead, end: match.index + match[0].length, entity: 'EMAIL' });
    }
    return spans;
  },
};
