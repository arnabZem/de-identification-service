import { DeidentifyBatchResponse, DeidentifyResponse, ReplaceResult } from '../models/deidentify';

export class DeidentifyView {
  /** Shapes the API response from a replacement result. */
  static render(result: ReplaceResult): DeidentifyResponse {
    return { deidentifiedText: result.text, entitiesDetected: result.counts };
  }

  /** Shapes the batch response, preserving input order. */
  static renderBatch(results: ReplaceResult[]): DeidentifyBatchResponse {
    return { results: results.map(DeidentifyView.render) };
  }
}
