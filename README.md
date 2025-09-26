# Amethyst - Telegram Bot для мониторинга GitHub

Современный Telegram-бот для получения последних коммитов пользователей GitHub с красивым форматированием.

## 🚀 Возможности

- **Команда `/monit`** - получение последних коммитов пользователя GitHub с ИИ анализом
- **Команда `/subscribe`** - подписка на уведомления о новых коммитах с ИИ описанием изменений
- **🤖 ИИ Анализ** - централизованная система анализа изменений с помощью ZhipuAI
- **Красивое форматирование** - каждый коммит в отдельном сообщении с эмодзи и ИИ анализом
- **Модульная архитектура** - легко добавлять новые команды
- **Умная валидация** - проверка корректности входных данных
- **Логирование** - подробные логи для отладки
- **Обработка ошибок** - graceful handling всех исключений

## 📦 Установка

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd amethyst
```

2. **Установите зависимости:**
```bash
bun install
```

3. **Настройте переменные окружения:**
```bash
cp .env.example .env
# Отредактируйте .env файл, добавив ваши токены
```

## 🔧 Настройка

### Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```env
# Telegram Bot Token (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# GitHub Personal Access Token (создайте на github.com/settings/tokens)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

# ZhipuAI API Key (получите на open.bigmodel.cn)
ZHIPUAI_API_KEY=your_zhipuai_api_key_here

# ZhipuAI Base URL (опционально)
ZHIPUAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/

# Уровень логирования (опционально)
LOG_LEVEL=info
```

### Получение токенов

1. **Telegram Bot Token:**
   - Напишите [@BotFather](https://t.me/BotFather) в Telegram
   - Создайте нового бота командой `/newbot`
   - Скопируйте полученный токен

2. **GitHub Personal Access Token:**
   - Перейдите на [github.com/settings/tokens](https://github.com/settings/tokens)
   - Создайте новый токен с правами `repo` (для доступа к репозиториям)

3. **ZhipuAI API Key:**
   - Зарегистрируйтесь на [open.bigmodel.cn](https://open.bigmodel.cn)
   - Создайте новый API ключ в личном кабинете
   - Скопируйте полученный ключ

## 🚀 Запуск

```bash
# Обычный запуск
bun start

# Запуск в режиме разработки (с автоперезагрузкой)
bun run dev

# Проверка типов
bun run type-check
```

## 📱 Использование

### Команды бота

- `/start` - Начать работу с ботом
- `/help` - Показать справку
- `/monit <username> [repo]` - Получить последние коммиты с ИИ анализом
- `/subscribe <username> [repo]` - Подписаться на уведомления о новых коммитах
- `/unsubscribe <username> [repo]` - Отписаться от уведомлений
- `/subscriptions` - Показать активные подписки

### Примеры использования

```
/monit octocat                    # Последние коммиты пользователя octocat с ИИ анализом
/monit octocat Hello-World       # Коммиты из репозитория Hello-World с ИИ анализом
/subscribe octocat                # Подписка на все репозитории octocat
/subscribe octocat Hello-World   # Подписка только на репозиторий Hello-World
```

## 🏗️ Архитектура

```
src/
├── index.ts                 # Точка входа
├── bot.ts                   # Инициализация бота
├── config/                  # Конфигурация
├── commands/                # Команды бота
│   ├── github/             # GitHub команды
│   │   ├── monit.ts        # Команда мониторинга
│   │   └── index.ts        # Экспорт команд
│   ├── help.ts             # Справка
│   ├── start.ts            # Стартовая команда
│   ├── subscribe.ts        # Подписка
│   ├── unsubscribe.ts     # Отписка
│   └── subscriptions.ts    # Список подписок
├── services/                # Сервисы
│   ├── github.ts           # GitHub API
│   ├── ai-analysis.ts      # ИИ анализ изменений
│   ├── monitoring.ts       # Мониторинг подписок
│   ├── subscription.ts     # Управление подписками
│   └── logger.ts            # Логирование
├── utils/                   # Утилиты
│   ├── formatter.ts        # Форматирование с ИИ
│   └── validator.ts        # Валидация
└── types/                   # TypeScript типы
    ├── bot.ts              # Типы бота
    ├── github.ts           # Типы GitHub
    └── subscription.ts     # Типы подписок
```

## 🔧 Разработка

### Добавление новых команд

1. Создайте новый файл в `src/commands/`
2. Реализуйте класс команды
3. Зарегистрируйте команду в `src/bot.ts`

### Добавление новых сервисов

1. Создайте новый файл в `src/services/`
2. Реализуйте необходимую логику
3. Импортируйте в нужных местах

## 📝 Логирование

Бот поддерживает различные уровни логирования:

- `error` - только ошибки
- `warn` - предупреждения и ошибки
- `info` - информационные сообщения (по умолчанию)
- `debug` - подробная отладочная информация

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License

---

Создано с ❤️ используя [Bun](https://bun.com) и [Grammy](https://grammy.dev)
