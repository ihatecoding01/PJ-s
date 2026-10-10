import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/nonce', authRateLimiter, AuthController.requestNonce);
router.post('/verify', authRateLimiter, AuthController.verifySignature);
router.get('/me', authenticate, AuthController.getMe);

export default router;
