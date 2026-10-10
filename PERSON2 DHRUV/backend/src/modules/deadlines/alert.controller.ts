import { Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class AlertController {
  static async listAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const resolvedParam = req.query.resolved as string | undefined;
      const agreementId = req.query.agreementId as string | undefined;

      const where: any = {};
      if (resolvedParam !== undefined) {
        where.resolved = resolvedParam === 'true';
      }
      if (agreementId) {
        where.agreementId = agreementId;
      }

      const alerts = await prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          agreement: { select: { id: true, title: true } },
          milestone: { select: { id: true, title: true, deadline: true } },
        },
      });

      return sendSuccess(res, alerts);
    } catch (error) {
      next(error);
    }
  }

  static async resolveAlert(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const alert = await prisma.alert.update({
        where: { id: req.params.id },
        data: { resolved: true },
      });

      return sendSuccess(res, alert, 200, 'Alert marked as resolved');
    } catch (error) {
      next(error);
    }
  }
}
