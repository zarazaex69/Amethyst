import { Bot } from 'grammy';
import { config } from './config/env';
import { MonitCommand } from './commands/github';
import { HelpCommand } from './commands/help';
import { StartCommand } from './commands/start';
import { SubscribeCommand } from './commands/subscribe';
import { UnsubscribeCommand } from './commands/unsubscribe';
import { SubscriptionsCommand } from './commands/subscriptions';
import { CommentCommand } from './commands/comment';
import { MonitoringService } from './services/monitoring';
import { SubscriptionService } from './services/subscription';
import { logger } from './services/logger';

export class AmethystBot {
  private bot: Bot;
  private monitCommand: MonitCommand;
  private helpCommand: HelpCommand;
  private startCommand: StartCommand;
  private subscribeCommand: SubscribeCommand;
  private unsubscribeCommand: UnsubscribeCommand;
  private subscriptionsCommand: SubscriptionsCommand;
  private commentCommand: CommentCommand;
  private monitoringService: MonitoringService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.bot = new Bot(config.telegram.token);
    
    // Создаем общий экземпляр сервиса подписок
    this.subscriptionService = new SubscriptionService();
    
    this.monitCommand = new MonitCommand();
    this.helpCommand = new HelpCommand();
    this.startCommand = new StartCommand();
    this.subscribeCommand = new SubscribeCommand(this.subscriptionService);
    this.unsubscribeCommand = new UnsubscribeCommand(this.subscriptionService);
    this.subscriptionsCommand = new SubscriptionsCommand(this.subscriptionService);
    this.commentCommand = new CommentCommand();
    this.monitoringService = new MonitoringService(this.subscriptionService);
    
    this.setupCommands();
    this.setupErrorHandling();
  }

  private setupCommands(): void {
    this.bot.command('start', (ctx) => this.startCommand.execute(ctx));
    this.bot.command('help', (ctx) => this.helpCommand.execute(ctx));
    this.bot.command('monit', (ctx) => this.monitCommand.execute(ctx));
    this.bot.command('subscribe', (ctx) => this.subscribeCommand.execute(ctx));
    this.bot.command('unsubscribe', (ctx) => this.unsubscribeCommand.execute(ctx));
    this.bot.command('subscriptions', (ctx) => this.subscriptionsCommand.execute(ctx));
    this.bot.command('comment', (ctx) => this.commentCommand.execute(ctx));
  }

  private setupErrorHandling(): void {
    this.bot.catch((err) => {
      logger.error('Bot error:', err);
    });
  }

  public async start(): Promise<void> {
    try {
      // Инициализируем 
      await this.monitoringService.initialize();
      
      // Передаем ссылку на бота в сервис мониторинга
      this.monitoringService.setBot(this.bot);
      
      // Запускаем бота
      this.bot.start();
      logger.info('🚀 Amethyst bot started!');
      
      // Запускаем мониторинг
      const { MONITORING } = await import('./config/constants');
      this.monitoringService.start(MONITORING.CHECK_INTERVAL_MINUTES);
      logger.info('📡 Monitoring service started!');
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  public stop(): void {
    this.monitoringService.stop();
    this.bot.stop();
    logger.info('🛑 Amethyst bot stopped!');
  }
}
