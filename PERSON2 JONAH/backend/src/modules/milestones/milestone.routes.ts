import { Router } from 'express';
import { MilestoneController } from './milestone.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/:id/submit', MilestoneController.submitMilestone);
router.post('/:id/review', MilestoneController.reviewMilestone);
router.get('/:id', MilestoneController.getById);

export default router;
