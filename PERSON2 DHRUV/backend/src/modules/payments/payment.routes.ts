import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/agreement/:agreementId', PaymentController.getPaymentSummary);

export default router;
