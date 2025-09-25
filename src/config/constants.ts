export const BOT_COMMANDS = {
  START: 'start',
  HELP: 'help',
  MONIT: 'monit',
} as const;

export const GITHUB_API = {
  PER_PAGE: 10,
  MAX_REPOS: 5,
  RATE_LIMIT: 5000, // requests per hour
} as const;

export const MESSAGES = {
  WELCOME: '🚀 Добро пожаловать в Amethyst Bot!\n\nИспользуйте /help для просмотра доступных команд.',
  HELP: `📖 **Доступные команды:**

/monit <username> [repo] - Получить последние коммиты пользователя GitHub
/help - Показать это сообщение
/start - Начать работу с ботом

**Примеры:**
\`/monit octocat\` - последние коммиты пользователя octocat
\`/monit octocat Hello-World\` - коммиты из репозитория Hello-World`,
  LOADING: ' Получаю последние коммиты...',
  NO_COMMITS: '📭 Коммиты не найдены.',
  ERROR: '❌ Произошла ошибка при получении коммитов.',
  INVALID_USERNAME: '❌ Неверное имя пользователя GitHub.',
  MISSING_USERNAME: '❌ Пожалуйста, укажите имя пользователя GitHub.',
} as const;
