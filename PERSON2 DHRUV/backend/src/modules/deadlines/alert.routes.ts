import { Router } from 'express';
import { AlertController } from './alert.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', AlertController.listAlerts);
router.post('/:id/resolve', AlertController.resolveAlert);

export default router;
