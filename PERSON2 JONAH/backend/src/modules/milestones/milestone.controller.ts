import { Response, NextFunction } from 'express';
import { MilestoneService } from './milestone.service';
import { submitMilestoneSchema, reviewMilestoneSchema } from './milestone.schema';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class MilestoneController {
  static async submitMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = submitMilestoneSchema.parse(req.body);
      const milestoneIdx = req.params.idx !== undefined ? Number(req.params.idx) : undefined;
      const result = await MilestoneService.submitMilestone(req.params.id, req.user!.id, data, milestoneIdx);
      return sendSuccess(res, result, 200, 'Milestone submitted and verified by Oracle');
    } catch (error) {
      next(error);
    }
  }

  static async reviewMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = reviewMilestoneSchema.parse(req.body);
      const result = await MilestoneService.reviewMilestone(req.params.id, req.user!.id, data);
      return sendSuccess(res, result, 200, `Milestone review recorded: ${data.action}`);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const milestone = await MilestoneService.getById(req.params.id);
      return sendSuccess(res, milestone);
    } catch (error) {
      next(error);
    }
  }
}
