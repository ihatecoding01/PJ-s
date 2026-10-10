import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import systemRoutes from './modules/system/system.routes';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import communityRoutes from './modules/community/community.routes';
import agreementRoutes from './modules/agreements/agreement.routes';
import milestoneRoutes from './modules/milestones/milestone.routes';
import disputeRoutes from './modules/disputes/dispute.routes';
import eventRoutes from './modules/events/event.routes';
import paymentRoutes from './modules/payments/payment.routes';
import alertRoutes from './modules/deadlines/alert.routes';

export function createApp() {
  const app = express();

  // CORS restricted to frontend URL (http://localhost:5173)
  app.use(
    cors({
      origin: [env.FRONTEND_URL, 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parser
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Unprotected / Public routes
  app.use('/', systemRoutes); // /health and /config
  app.use('/auth', authRoutes); // /auth/nonce, /auth/verify, /auth/me (me handles its own auth check)

  // Protected business routes
  app.use('/users', userRoutes);
  app.use('/community', communityRoutes);
  app.use('/agreements', agreementRoutes);
  app.use('/milestones', milestoneRoutes);
  app.use('/disputes', disputeRoutes);
  app.use('/events', eventRoutes);
  app.use('/payments', paymentRoutes);
  app.use('/alerts', alertRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested endpoint does not exist on this server.',
      },
    });
  });

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
