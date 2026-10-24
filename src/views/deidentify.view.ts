import { DeidentifyResponse, ReplaceResult } from '../models/deidentify';

export class DeidentifyView {
  /** Shapes the API response from a replacement result. */
  static render(result: ReplaceResult): DeidentifyResponse {
    return { deidentifiedText: result.text, entitiesDetected: result.counts };
  }
}
