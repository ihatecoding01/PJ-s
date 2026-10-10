import { createApp } from './app';
import { env } from './config/env';
import { DeadlineWatcherService } from './modules/deadlines/deadlineWatcher.service';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 FairWork Backend Server running on http://localhost:${env.PORT}`);
  console.log(`📡 CORS Origin: ${env.FRONTEND_URL}`);
  console.log(`🤖 AI Mock Mode: ${env.AI_MOCK}`);
  console.log(`⛓️  Chain Mock Mode: ${env.CHAIN_MOCK}`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);
  console.log(`====================================================`);

  // Start background deadline and review window watcher
  DeadlineWatcherService.startWatcher(60000);
});

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  DeadlineWatcherService.stopWatcher();
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server stopped and database disconnected.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export { app, server };
