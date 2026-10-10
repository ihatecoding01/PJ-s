import { Router } from 'express';
import { EventController } from './event.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/index/:id', EventController.indexEvents);
router.get('/timeline/:id', EventController.getAgreementTimeline);

export default router;
