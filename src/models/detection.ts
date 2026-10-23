import { EntityType, Span } from './entity';

/** A detection rule for one entity type. */
export interface Rule {
  entity: EntityType;
  find(text: string): Span[];
}
