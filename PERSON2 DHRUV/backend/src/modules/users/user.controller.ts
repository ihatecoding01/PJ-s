import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { updateProfileSchema } from './user.schema';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getById(req.user!.id);
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getById(req.params.id);
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const updated = await UserService.updateProfile(req.user!.id, validated);
      return sendSuccess(res, updated, 200, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as string | undefined;
      const users = await UserService.listUsers(role);
      return sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }
}
