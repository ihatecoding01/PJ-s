import { Response, NextFunction } from 'express';
import { EventIndexerService } from './eventIndexer.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class EventController {
  static async indexEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const records = await EventIndexerService.indexEventsForAgreement(req.params.id);
      return sendSuccess(res, records, 200, `Indexed ${records.length} new contract event(s)`);
    } catch (error) {
      next(error);
    }
  }

  static async getAgreementTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const timeline = await EventIndexerService.buildTimeline(req.params.id);
      return sendSuccess(res, timeline);
    } catch (error) {
      next(error);
    }
  }
}
