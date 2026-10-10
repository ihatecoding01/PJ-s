import { Router } from 'express';
import { AgreementController } from './agreement.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/draft', AgreementController.draftAgreement);
router.get('/', AgreementController.listUserAgreements);
router.get('/:id', AgreementController.getById);
router.put('/:id', AgreementController.editAgreement);
router.post('/:id/approve', AgreementController.approveAgreement);
router.post('/:id/link', AgreementController.linkAgreement);

export default router;
