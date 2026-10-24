import { Rule } from '../models/detection';
import { Span } from '../models/entity';
import { ENTITIES, RULES } from '../rules';

const priority = (span: Span) => ENTITIES.indexOf(span.entity);
const ALNUM = /[\p{L}\p{M}\p{N}]/u;

/** `[start, end)` narrowed to its first and last letter, mark or digit; null when it has none. */
function trim(text: string, start: number, end: number): [number, number] | null {
  const part = text.slice(start, end);
  const lead = part.search(ALNUM);
  if (lead < 0) return null;
  for (const ch of [...part].reverse()) {
    if (ALNUM.test(ch)) break;
    end -= ch.length;
  }
  return [start + lead, end];
}

/**
 * Finds sensitive spans in `text` using all rules.
 * Overlaps are resolved deterministically: longest span wins, ties go to the higher-priority entity.
 * A partially overlapped loser is not dropped: each uncovered part of it that holds a letter or digit
 * is still redacted (trimmed of edge punctuation), so no fragment of it leaks.
 * @returns non-overlapping spans sorted by start.
 */
export function detect(text: string, rules: Rule[] = RULES): Span[] {
  const candidates = rules
    .flatMap((rule) => rule.find(text))
    .sort((a, b) => b.end - b.start - (a.end - a.start) || priority(a) - priority(b) || a.start - b.start);

  const covered = new Uint8Array(text.length);
  const accepted: Span[] = [];
  const accept = (span: Span) => {
    covered.fill(1, span.start, span.end);
    accepted.push(span);
  };
  for (const span of candidates) {
    if (!covered.subarray(span.start, span.end).some(Boolean)) {
      accept(span);
      continue;
    }
    for (let i = span.start; i < span.end; i++) {
      if (covered[i]) continue;
      let j = i;
      while (j < span.end && !covered[j]) j++;
      const part = trim(text, i, j);
      if (part) accept({ start: part[0], end: part[1], entity: span.entity });
      i = j;
    }
  }
  return accepted.sort((a, b) => a.start - b.start);
}
