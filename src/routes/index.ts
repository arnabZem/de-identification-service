import { Router } from 'express';
import { DeidentifyController } from '../controllers/deidentify.controller';
import { HealthController } from '../controllers/health.controller';
import { batchValidator, deidentifyValidator } from '../validators/deidentify.validator';

const router = Router();
const deidentify = new DeidentifyController();
const health = new HealthController();

router.get('/health', health.getHealth);
router.post('/deidentify', deidentifyValidator, deidentify.deidentify);
router.post('/deidentify/batch', batchValidator, deidentify.batch);

export default router;
