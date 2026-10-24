import { EntityType, Span } from '../models/entity';

/** Character-class contents for separators pasted from documents: space plus no-break, figure and narrow no-break spaces. */
export const SPACES = ' \\u00a0\\u2007\\u202f';
/** Character-class contents for hyphen plus Unicode hyphens, dashes and minus sign. */
export const DASHES = '\\-\\u2010-\\u2015\\u2212';

/**
 * Runs a global `pattern` over `text` and returns one span per accepted match.
 * `accept` may narrow the span (return `[start, end]`) or reject the match (return `null`).
 * After a rejection, scanning resumes one character later so a valid match hidden
 * inside a rejected one is still found.
 */
export function scan(
  text: string,
  pattern: RegExp,
  entity: EntityType,
  accept: (match: RegExpExecArray) => [number, number] | null = (m) => [m.index, m.index + m[0].length],
): Span[] {
  const spans: Span[] = [];
  pattern.lastIndex = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const range = accept(match);
    if (range) spans.push({ start: range[0], end: range[1], entity });
    else pattern.lastIndex = match.index + 1;
  }
  return spans;
}
