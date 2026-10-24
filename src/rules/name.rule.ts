import { Rule } from '../models/detection';
import { SPACES, scan } from './scan';

const W = `[\\t${SPACES}]`; // one space-like character
// A capitalized word that is not itself the next label (`Age:`, `DOB:`).
const WORD = `(?![\\p{L}\\p{M}'’-]*${W}*:)\\p{Lu}[\\p{L}\\p{M}'’-]*`;
// Case-insensitive via `(?i:...)` only, so `\p{Lu}` in WORD stays case-sensitive.
const LABEL = `(?i:(?:(?:patient|full|first|middle|last|legal|maiden)${W}+)?name|patient)`;
// Label (not inside a word), ":", then 1-5 words on the same line; "." (initials) or "," (`Doe, John`) may precede a space.
const NAME = new RegExp(`(?<!\\p{L})${LABEL}${W}*:${W}*(?<name>${WORD}(?:\\.?,?${W}+${WORD}){0,4})`, 'gud');

/** NAME: capitalized words after an explicit name label and colon. Only the name is redacted; unlabeled names are never matched. */
export const nameRule: Rule = { entity: 'NAME', find: (text) => scan(text, NAME, 'NAME', (m) => m.indices!.groups!.name!) };
