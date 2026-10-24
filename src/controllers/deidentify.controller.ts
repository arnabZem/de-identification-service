import { RequestHandler } from 'express';
import { DeidentifyBatchRequest, DeidentifyRequest } from '../models/deidentify';
import { DeidentifyService } from '../services/deidentify.service';
import { DeidentifyView } from '../views/deidentify.view';

export class DeidentifyController {
  constructor(private readonly service = new DeidentifyService()) {}

  /** POST /deidentify: runs the service on the validated body and renders the response. */
  deidentify: RequestHandler = (req, res) => {
    const { text, entities } = req.body as DeidentifyRequest;
    const result = this.service.run(text, entities);
    res.locals.logFields = { len: text.length, ...result.counts };
    res.json(DeidentifyView.render(result));
  };

  /** POST /deidentify/batch: de-identifies each text independently; logs totals across the batch. */
  batch: RequestHandler = (req, res) => {
    const { texts, entities } = req.body as DeidentifyBatchRequest;
    const results = texts.map((text) => this.service.run(text, entities));
    const totals: Record<string, number> = {};
    for (const { counts } of results) for (const [entity, n] of Object.entries(counts)) totals[entity] = (totals[entity] ?? 0) + n;
    res.locals.logFields = { records: texts.length, len: texts.reduce((sum, text) => sum + text.length, 0), ...totals };
    res.json(DeidentifyView.renderBatch(results));
  };
}
