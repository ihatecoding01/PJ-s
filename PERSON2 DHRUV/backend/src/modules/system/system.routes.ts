import { Router, Request, Response } from 'express';
import { ChainAdapter } from '../../adapters/chainAdapter';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * Public health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'ok',
    service: 'FairWork Express Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    environment: env.NODE_ENV,
    mocks: {
      aiMock: env.AI_MOCK,
      chainMock: env.CHAIN_MOCK,
    },
  });
});

/**
 * Public configuration endpoint
 * Exposes chain ID, contract address, oracle address, and ABI
 */
router.get('/config', (_req: Request, res: Response) => {
  const config = ChainAdapter.getConfig();
  return sendSuccess(res, config);
});

export default router;
