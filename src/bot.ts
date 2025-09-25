import { Bot } from 'grammy';
import { config } from './config/env';
import { MonitCommand } from './commands/github';
import { HelpCommand } from './commands/help';
import { StartCommand } from './commands/start';
import { logger } from './services/logger';

export class AmethystBot {
  private bot: Bot;
  private monitCommand: MonitCommand;
  private helpCommand: HelpCommand;
  private startCommand: StartCommand;

  constructor() {
    this.bot = new Bot(config.telegram.token);
    this.monitCommand = new MonitCommand();
    this.helpCommand = new HelpCommand();
    this.startCommand = new StartCommand();
    
    this.setupCommands();
    this.setupErrorHandling();
  }

  private setupCommands(): void {
    this.bot.command('start', (ctx) => this.startCommand.execute(ctx));
    this.bot.command('help', (ctx) => this.helpCommand.execute(ctx));
    this.bot.command('monit', (ctx) => this.monitCommand.execute(ctx));
  }

  private setupErrorHandling(): void {
    this.bot.catch((err) => {
      logger.error('Bot error:', err);
    });
  }

  public start(): void {
    this.bot.start();
    logger.info('🚀 Amethyst bot started!');
  }

  public stop(): void {
    this.bot.stop();
    logger.info('🛑 Amethyst bot stopped!');
  }
}
