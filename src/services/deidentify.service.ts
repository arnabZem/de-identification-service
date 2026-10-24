import { ReplaceResult } from '../models/deidentify';
import { ENTITY_TYPES, EntityType } from '../models/entity';
import { detect } from '../utils/detect';
import { replace } from '../utils/replace';

export class DeidentifyService {
  /**
   * De-identifies `text`. Detection runs for all rules so overlaps resolve correctly;
   * only the selected `entities` (default: all) are replaced.
   */
  run(text: string, entities: readonly EntityType[] = ENTITY_TYPES): ReplaceResult {
    const selected = new Set(entities);
    return replace(text, detect(text).filter((span) => selected.has(span.entity)));
  }
}
