import { Router } from 'express';
import { DeidentifyController } from '../controllers/deidentify.controller';
import { HealthController } from '../controllers/health.controller';
import { deidentifyValidator } from '../validators/deidentify.validator';

const router = Router();
const deidentify = new DeidentifyController();
const health = new HealthController();

router.get('/health', health.getHealth);
router.post('/deidentify', deidentifyValidator, deidentify.deidentify);

export default router;
