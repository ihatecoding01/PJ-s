import { Response, NextFunction } from 'express';
import { MilestoneService } from './milestone.service';
import { ScopeDetectorService } from './scopeDetector.service';
import { DeadlineWatcherService } from '../deadlines/deadlineWatcher.service';
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

  static async getHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const health = await DeadlineWatcherService.evaluateMilestoneHealth(req.params.id);
      return sendSuccess(res, health, 200, 'Milestone in-flight health evaluated');
    } catch (error) {
      next(error);
    }
  }

  static async checkScope(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rejectionReason } = req.body;
      if (!rejectionReason || typeof rejectionReason !== 'string') {
        return res.status(400).json({ success: false, error: 'rejectionReason string is required' });
      }
      const milestoneIdx = req.params.idx !== undefined ? Number(req.params.idx) : undefined;
      const result = await ScopeDetectorService.analyzeRevisionScope(req.params.id, rejectionReason, milestoneIdx);
      return sendSuccess(res, result, 200, 'Milestone revision scope analyzed');
    } catch (error) {
      next(error);
    }
  }
}

