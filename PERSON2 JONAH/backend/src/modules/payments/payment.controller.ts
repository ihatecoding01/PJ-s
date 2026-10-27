import { Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class PaymentController {
  static async getPaymentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agreementId = req.params.agreementId || req.params.id;
      if (!agreementId || agreementId === 'undefined' || agreementId === 'null') {
        return res.status(400).json({ success: false, error: 'Agreement ID is required' });
      }
      const summary = await PaymentService.getPaymentSummary(agreementId);
      return sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }
}
