import { readFileSync } from 'node:fs';
import { Rule } from '../models/detection';
import { CustomEntity, ENTITY_TYPES } from '../models/entity';
import { scan } from './scan';

const ENTITY_NAME = /^[A-Z][A-Z0-9_]*$/;

/**
 * Builds rules from a JSON file holding an array of `{ "entity": "MRN", "pattern": "...", "flags"?: "i" }`.
 * If the pattern has a named group `value` and it matched, only that group is redacted.
 * Patterns are trusted operator config: they are NOT checked for catastrophic backtracking.
 * Throws on any invalid entry, so a bad file stops the service at startup.
 */
export function loadCustomRules(file: string | undefined): Rule[] {
  if (!file) return [];
  const defs: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(defs)) throw new Error('Custom rules: file must contain a JSON array');

  const taken = new Set<string>(ENTITY_TYPES);
  return defs.map((def, i): Rule => {
    const { entity, pattern, flags = '' } = (def ?? {}) as Record<string, unknown>;
    if (typeof entity !== 'string' || !ENTITY_NAME.test(entity)) throw new Error(`Custom rule ${i}: entity must be UPPER_SNAKE_CASE`);
    if (taken.has(entity)) throw new Error(`Custom rule ${i}: entity ${entity} is already defined`);
    if (typeof pattern !== 'string' || !pattern || typeof flags !== 'string') throw new Error(`Custom rule ${i}: pattern and flags must be strings`);
    taken.add(entity);

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, `${flags.replace(/[gdy]/g, '')}gd`); // scan needs g; d gives the `value` group's indices
    } catch (err) {
      throw new Error(`Custom rule ${i} (${entity}): ${(err as Error).message}`);
    }
    return {
      entity: entity as CustomEntity,
      find: (text) =>
        scan(text, regex, entity as CustomEntity, (m) => {
          const [start, end] = m.indices!.groups?.value ?? [m.index, m.index + m[0].length];
          return end > start ? [start, end] : null; // empty matches are skipped (and scanning advances)
        }),
    };
  });
}
