import { Response, NextFunction } from 'express';
import { EventIndexerService } from './eventIndexer.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class EventController {
  static async indexEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agreementId = req.params.id || req.params.agreementId;
      if (!agreementId || agreementId === 'undefined' || agreementId === 'null') {
        return sendError(res, 'Agreement ID is required', 400);
      }
      const records = await EventIndexerService.indexEventsForAgreement(agreementId);
      return sendSuccess(res, records, 200, `Indexed ${records.length} new contract event(s)`);
    } catch (error) {
      next(error);
    }
  }

  static async getAgreementTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agreementId = req.params.id || req.params.agreementId;
      if (!agreementId || agreementId === 'undefined' || agreementId === 'null') {
        return sendError(res, 'Agreement ID is required', 400);
      }
      const timeline = await EventIndexerService.buildTimeline(agreementId);
      return sendSuccess(res, timeline);
    } catch (error) {
      next(error);
    }
  }
}
