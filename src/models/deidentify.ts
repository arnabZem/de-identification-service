import { EntityType } from './entity';

export interface DeidentifyRequest {
  text: string;
  entities?: EntityType[];
}

export interface DeidentifyResponse {
  deidentifiedText: string;
  entitiesDetected: Partial<Record<EntityType, number>>;
}
