import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { nonceRequestSchema, verifySignatureSchema } from './auth.schema';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class AuthController {
  static async requestNonce(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = Object.keys(req.body || {}).length ? req.body : req.query;
      const { walletAddress } = nonceRequestSchema.parse(payload);
      const nonce = await AuthService.getOrCreateNonce(walletAddress);
      return sendSuccess(res, { nonce, message: `FairWork login: ${nonce}` });
    } catch (error) {
      next(error);
    }
  }

  static async verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { walletAddress, signature } = verifySignatureSchema.parse(req.body);
      const result = await AuthService.verifySignature(walletAddress, signature);
      return sendSuccess(res, result, 200, 'Authentication successful');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      return sendSuccess(res, {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        bio: user.bio,
        skills: user.skills,
        githubUsername: user.githubUsername,
        createdAt: user.createdAt,
      });
    } catch (error) {
      next(error);
    }
  }
}
