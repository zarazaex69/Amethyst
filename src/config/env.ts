export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN!,
  },
  github: {
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
  },
  zhipuai: {
    apiKey: process.env.ZHIPUAI_API_KEY,
    baseUrl: process.env.ZHIPUAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/',
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

// ZhipuAI API ключ опциональный - ИИ функциональность будет отключена если не указан
if (!config.zhipuai.apiKey) {
  console.warn('⚠️  ZHIPUAI_API_KEY not found - AI analysis will be disabled');
}
