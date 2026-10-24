/** Built-in entity types, ordered by overlap priority (highest first). */
export const ENTITY_TYPES = ['CREDIT_CARD', 'SSN', 'DATE_OF_BIRTH', 'IP_ADDRESS', 'EMAIL', 'PHONE', 'NAME'] as const;

export type BuiltinEntity = (typeof ENTITY_TYPES)[number];

/** Entity name from the custom rules file; only `loadCustomRules` creates these, after validation. */
export type CustomEntity = string & { readonly __brand: 'CustomEntity' };

export type EntityType = BuiltinEntity | CustomEntity;

/** A detected region of text: `[start, end)` in UTF-16 code units. */
export interface Span {
  start: number;
  end: number;
  entity: EntityType;
}
