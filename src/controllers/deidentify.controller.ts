import { RequestHandler } from 'express';
import { DeidentifyRequest } from '../models/deidentify';
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
}
