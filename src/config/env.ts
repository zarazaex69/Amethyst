export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN!,
  },
  github: {
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
  },
  cache: {
    ttl: 300, // 5 минут
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

// Валидация обязательных переменных окружения
if (!config.telegram.token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (!config.github.token) {
  throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is required');
}
