import { EntityType } from './entity';

/** Output of `replace`: rewritten text and replacements made per entity type. */
export interface ReplaceResult {
  text: string;
  counts: Partial<Record<EntityType, number>>;
}
