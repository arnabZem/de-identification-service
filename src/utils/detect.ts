import { Rule } from '../models/detection';
import { ENTITY_TYPES, Span } from '../models/entity';
import { RULES } from '../rules';

const priority = (span: Span) => ENTITY_TYPES.indexOf(span.entity);

/**
 * Finds sensitive spans in `text` using all rules.
 * Overlaps are resolved deterministically: longest span wins, ties go to the higher-priority entity.
 * @returns non-overlapping spans sorted by start.
 */
export function detect(text: string, rules: Rule[] = RULES): Span[] {
  const candidates = rules
    .flatMap((rule) => rule.find(text))
    .sort((a, b) => b.end - b.start - (a.end - a.start) || priority(a) - priority(b) || a.start - b.start);

  const covered = new Uint8Array(text.length);
  const accepted: Span[] = [];
  for (const span of candidates) {
    if (covered.subarray(span.start, span.end).some(Boolean)) continue;
    covered.fill(1, span.start, span.end);
    accepted.push(span);
  }
  return accepted.sort((a, b) => a.start - b.start);
}
