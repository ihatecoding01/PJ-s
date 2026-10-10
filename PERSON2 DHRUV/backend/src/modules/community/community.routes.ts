import { Router } from 'express';
import { CommunityController } from './community.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Protected routes
router.use(authenticate);

// Posts
router.post('/posts', CommunityController.createPost);
router.get('/posts', CommunityController.listPosts);
router.get('/posts/:id', CommunityController.getPostById);

// Proposals
router.post('/posts/:id/proposals', CommunityController.submitProposal);
router.get('/posts/:id/proposals', CommunityController.getProposalsForPost);

// Threads & Messages
router.post('/threads', CommunityController.createThread);
router.get('/threads', CommunityController.listThreads);
router.get('/threads/:id', CommunityController.getThreadById);
router.post('/threads/:id/messages', CommunityController.sendMessage);

export default router;
