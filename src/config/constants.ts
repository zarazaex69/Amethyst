export const BOT_COMMANDS = {
  START: 'start',
  HELP: 'help',
  MONIT: 'monit',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIPTIONS: 'subscriptions',
} as const;

export const GITHUB_API = {
  PER_PAGE: 10,
  MAX_REPOS: 5,
  RATE_LIMIT: 5000, // requests per hour
} as const;

export const MONITORING = {
  CHECK_INTERVAL_MINUTES: 1, // Интервал проверки новых коммитов
  MAX_NOTIFICATIONS_PER_CYCLE: 10, // Максимум уведомлений за один цикл
  DATA_DIR: 'data', // Директория для хранения данных
} as const;

export const DIFF_CONFIG = {
  MAX_FILES: 5, // Максимум файлов для показа в diff
  MAX_LINES_PER_FILE: 10, // Максимум строк diff на файл
  MAX_TOTAL_LINES: 50, // Максимум общих строк diff
  SHOW_TOP_FILES_ONLY: true, // Показывать только топ измененных файлов
} as const;

export const MESSAGES = {
  WELCOME: '🚀 Добро пожаловать в Amethyst Bot!\n\nИспользуйте /help для просмотра доступных команд.',
  HELP: `📖 **Доступные команды:**

**Мониторинг:**
/subscribe <username> [repo] - Подписаться на уведомления о новых коммитах
/unsubscribe <username> [repo] - Отписаться от уведомлений
/subscriptions - Показать ваши активные подписки

**Анализ и ревью:**
/monit <username> [repo] - Получить последние коммиты с ИИ анализом
/comment <username> <repo> [commit_sha] - Создать подробное ИИ ревью в GitHub Issues

**Служебные:**
/help - Показать это сообщение
/start - Начать работу с ботом

**Примеры:**
\`/subscribe octocat\` - подписаться на все репозитории octocat
\`/monit octocat\` - получить последние коммиты с ИИ анализом
\`/comment octocat Hello-World\` - создать ИИ ревью последнего коммита
\`/comment octocat Hello-World a1b2c3d\` - создать ИИ ревью конкретного коммита`,
  LOADING: ' Получаю последние коммиты...',
  NO_COMMITS: '📭 Коммиты не найдены.',
  ERROR: '❌ Произошла ошибка при получении коммитов.',
  INVALID_USERNAME: '❌ Неверное имя пользователя GitHub.',
  MISSING_USERNAME: '❌ Пожалуйста, укажите имя пользователя GitHub.',
  SUBSCRIPTION_SUCCESS: '✅ Подписка активирована!',
  SUBSCRIPTION_CANCELLED: '✅ Подписка отменена!',
  NO_SUBSCRIPTIONS: '📭 У вас нет активных подписок',
} as const;
