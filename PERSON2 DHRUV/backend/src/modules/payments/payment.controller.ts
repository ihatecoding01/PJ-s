import { Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class PaymentController {
  static async getPaymentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summary = await PaymentService.getPaymentSummary(req.params.agreementId);
      return sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }
}
