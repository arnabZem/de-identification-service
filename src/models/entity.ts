/** Supported entity types, ordered by overlap priority (highest first). */
export const ENTITY_TYPES = ['CREDIT_CARD', 'SSN', 'DATE_OF_BIRTH', 'IP_ADDRESS', 'EMAIL', 'PHONE'] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/** A detected region of text: `[start, end)` in UTF-16 code units. */
export interface Span {
  start: number;
  end: number;
  entity: EntityType;
}
