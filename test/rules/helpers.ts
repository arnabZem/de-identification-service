import { Rule } from '../../src/models/detection';

/** Matched substrings for `rule` in `text`. */
export const found = (rule: Rule, text: string) => rule.find(text).map((s) => text.slice(s.start, s.end));

/** Time budget in ms for adversarial inputs of ~1 MB. */
export const BUDGET_MS = 1000;
