import { Router } from 'express';
import { DisputeController } from './dispute.controller';
import { uploadEvidence } from '../../middleware/upload';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', DisputeController.createDispute);
router.get('/:id', DisputeController.getById);
router.post('/:id/evidence', uploadEvidence.single('file'), DisputeController.uploadEvidence);
router.post('/:id/ai-summary', DisputeController.generateAiSummary);
router.get('/:id/dossier', DisputeController.getDossier);
router.post('/:id/dossier', DisputeController.getDossier);
router.post('/:id/query', DisputeController.queryDossier);
router.post('/:id/resolve', DisputeController.resolveDispute);

export default router;
