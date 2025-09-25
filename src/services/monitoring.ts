import { GitHubService } from './github';
import { SubscriptionService } from './subscription';
import { SmartFormatter } from '../utils/formatter';
import { logger } from './logger';
import type { Subscription, NewCommitNotification } from '../types/subscription';
import type { Commit } from '../types/github';
import { Bot } from 'grammy';

export class MonitoringService {
  private githubService: GitHubService;
  private subscriptionService: SubscriptionService;
  private formatter: SmartFormatter;
  private bot: Bot | null = null;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.githubService = new GitHubService();
    this.subscriptionService = new SubscriptionService();
    this.formatter = new SmartFormatter();
  }

  setBot(bot: Bot): void {
    this.bot = bot;
  }

  async initialize(): Promise<void> {
    await this.subscriptionService.initialize();
    logger.info('Monitoring service initialized');
  }

  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      logger.warn('Monitoring service is already running');
      return;
    }

    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`Starting monitoring service with ${intervalMinutes} minute intervals`);

    // Первая проверка сразу
    this.checkForNewCommits();

    // Затем периодические проверки
    this.checkInterval = setInterval(() => {
      this.checkForNewCommits();
    }, intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Monitoring service stopped');
  }

  private async checkForNewCommits(): Promise<void> {
    try {
      logger.info('Checking for new commits...');
      const subscriptions = await this.subscriptionService.getAllActiveSubscriptions();
      
      if (subscriptions.length === 0) {
        logger.info('No active subscriptions to check');
        return;
      }

      logger.info(`Checking ${subscriptions.length} subscriptions`);

      for (const subscription of subscriptions) {
        try {
          await this.checkSubscription(subscription);
        } catch (error) {
          logger.error(`Error checking subscription ${subscription.id}:`, error);
        }
      }

      await this.subscriptionService.updateGlobalCheckTime();
      logger.info('Completed commit check cycle');
    } catch (error) {
      logger.error('Error during commit check:', error);
    }
  }

  private async checkSubscription(subscription: Subscription): Promise<void> {
    try {
      const commits = await this.githubService.getLatestCommits(
        subscription.username, 
        subscription.repo
      );

      if (commits.length === 0) {
        return;
      }

      // Находим новые коммиты
      const newCommits = this.findNewCommits(subscription, commits);
      
      if (newCommits.length > 0) {
        logger.info(`Found ${newCommits.length} new commits for ${subscription.username}`);
        
        // Обновляем последний коммит
        const latestCommit = newCommits[0];
        if (latestCommit) {
          await this.subscriptionService.updateLastCommit(
            subscription.id, 
            latestCommit.sha
          );
        }

        // Отправляем уведомления (это будет обработано в боте)
        for (const commit of newCommits) {
          const notification: NewCommitNotification = {
            subscription,
            commit: {
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.commit.author?.name || 'Неизвестный автор',
              date: commit.commit.author?.date || new Date().toISOString(),
              url: commit.html_url,
            },
          };
          
          // Здесь мы будем отправлять уведомления через бота
          await this.sendNotification(notification);
        }
      }
    } catch (error) {
      logger.error(`Error checking subscription for ${subscription.username}:`, error);
    }
  }

  private findNewCommits(subscription: Subscription, commits: Commit[]): Commit[] {
    if (!subscription.lastCommitSha) {
      // Если это первая проверка, возвращаем только последний коммит
      return commits.slice(0, 1);
    }

    // Находим коммиты после последнего известного
    const lastCommitIndex = commits.findIndex(commit => commit.sha === subscription.lastCommitSha);
    
    if (lastCommitIndex === -1) {
      // Если последний коммит не найден, возвращаем все коммиты
      return commits;
    }

    // Возвращаем только новые коммиты
    return commits.slice(0, lastCommitIndex);
  }

  private async sendNotification(notification: NewCommitNotification): Promise<void> {
    try {
      const formattedMessage = this.formatNotification(notification);
      
      if (this.bot) {
        await this.bot.api.sendMessage(notification.subscription.userId, formattedMessage, {
          parse_mode: 'Markdown',
        });
        logger.info(`Sent notification to user ${notification.subscription.userId}`);
      } else {
        logger.warn('Bot not available for sending notifications');
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  private formatNotification(notification: NewCommitNotification): string {
    const { subscription, commit } = notification;
    const repoText = subscription.repo ? ` в репозитории \`${subscription.repo}\`` : '';
    
    return `🆕 **Новый коммит от ${subscription.username}${repoText}**

${this.formatter.formatCommit({
  sha: commit.sha,
  commit: {
    message: commit.message,
    author: {
      name: commit.author,
      date: commit.date,
    },
  },
  html_url: commit.url,
})}`;
  }

  isMonitoringActive(): boolean {
    return this.isRunning;
  }
}
