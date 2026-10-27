import { Router } from 'express';
import { AlertController } from './alert.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticate, AlertController.listAlerts);
router.post('/:id/resolve', authenticate, AlertController.resolveAlert);

export default router;
