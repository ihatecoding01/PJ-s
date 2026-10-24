import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All user routes are protected
router.use(authenticate);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.get('/me', UserController.getProfile);
router.put('/me', UserController.updateProfile);
router.get('/', UserController.listUsers);
router.get('/:id', UserController.getUserById);

export default router;
