import { BuiltinEntity, CustomEntity, EntityType } from './entity';

/** Replacements per entity type; only types with at least one replacement are present. */
export type EntityCounts = Partial<Record<BuiltinEntity, number>> & Record<CustomEntity, number>;

export interface DeidentifyRequest {
  text: string;
  entities?: EntityType[];
}

export interface DeidentifyResponse {
  deidentifiedText: string;
  entitiesDetected: EntityCounts;
}

export interface DeidentifyBatchRequest {
  texts: string[];
  entities?: EntityType[];
}

/** One result per input text, in input order. */
export interface DeidentifyBatchResponse {
  results: DeidentifyResponse[];
}

/** Output of `replace`: rewritten text and replacements made per entity type. */
export interface ReplaceResult {
  text: string;
  counts: EntityCounts;
}
