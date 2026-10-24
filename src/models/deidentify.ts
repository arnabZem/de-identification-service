import { EntityType } from './entity';

export interface DeidentifyRequest {
  text: string;
  entities?: EntityType[];
}

export interface DeidentifyResponse {
  deidentifiedText: string;
  entitiesDetected: Partial<Record<EntityType, number>>;
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
  counts: Partial<Record<EntityType, number>>;
}
