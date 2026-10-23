import { Span } from '../models/entity';
import { ReplaceResult } from '../models/replacement';

/**
 * Replaces each span with its `[ENTITY]` placeholder in a single pass.
 * Expects non-overlapping spans sorted by start; text outside spans is copied untouched.
 */
export function replace(text: string, spans: Span[]): ReplaceResult {
  const counts: ReplaceResult['counts'] = {};
  let out = '';
  let cursor = 0;
  for (const { start, end, entity } of spans) {
    out += `${text.slice(cursor, start)}[${entity}]`;
    counts[entity] = (counts[entity] ?? 0) + 1;
    cursor = end;
  }
  return { text: out + text.slice(cursor), counts };
}
