import { AmethystBot } from './bot';
import { logger } from './services/logger';

// Обработка завершения процесса
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Запуск бота
try {
  const bot = new AmethystBot();
  bot.start();
} catch (error) {
  logger.error('Failed to start bot:', error);
  process.exit(1);
}