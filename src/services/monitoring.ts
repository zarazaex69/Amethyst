import { GitHubService } from './github';
import { SubscriptionService } from './subscription';
import { AIAnalysisService } from './ai-analysis';
import { SmartFormatter } from '../utils/formatter';
import { logger } from './logger';
import type { Subscription, NewCommitNotification } from '../types/subscription';
import type { Commit } from '../types/github';
import { Bot } from 'grammy';

export class MonitoringService {
  private githubService: GitHubService;
  private subscriptionService: SubscriptionService;
  private aiAnalysisService: AIAnalysisService;
  private formatter: SmartFormatter;
  private bot: Bot | null = null;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(subscriptionService?: SubscriptionService) {
    this.githubService = new GitHubService();
    this.subscriptionService = subscriptionService || new SubscriptionService();
    
    // Инициализируем ИИ сервис только если API ключ доступен
    try {
      this.aiAnalysisService = new AIAnalysisService();
    } catch (error) {
      logger.warn('AI Analysis service disabled - ZhipuAI API key not configured');
      this.aiAnalysisService = null as any;
    }
    
    this.formatter = new SmartFormatter();
  }

  setBot(bot: Bot): void {
    this.bot = bot;
  }

  async initialize(): Promise<void> {
    await this.subscriptionService.initialize();
    
    // Проверяем количество активных подписок при инициализации
    const activeSubscriptions = await this.subscriptionService.getAllActiveSubscriptions();
    logger.info(`Monitoring service initialized with ${activeSubscriptions.length} active subscriptions`);
    
    if (activeSubscriptions.length > 0) {
      logger.info('Active subscriptions:');
      activeSubscriptions.forEach(sub => {
        logger.info(`  - User ${sub.userId}: ${sub.username}${sub.repo ? `/${sub.repo}` : ''}`);
      });
    }
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

      logger.info(`Checking ${subscriptions.length} subscriptions:`);
      subscriptions.forEach(sub => {
        logger.info(`  - User ${sub.userId}: ${sub.username}${sub.repo ? `/${sub.repo}` : ''} (last commit: ${sub.lastCommitSha || 'none'})`);
      });

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
        logger.info(`No commits found for ${subscription.username}${subscription.repo ? `/${subscription.repo}` : ''}`);
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

        // Получаем детальную информацию о коммитах с файлами
        for (const commit of newCommits) {
          try {
            // Получаем детальную информацию о коммите с файлами
            const detailedCommit = subscription.repo 
              ? await this.githubService.getCommitWithFiles(subscription.username, subscription.repo, commit.sha)
              : commit;

            const notification: NewCommitNotification = {
              subscription,
              commit: {
                sha: detailedCommit.sha,
                message: detailedCommit.commit.message,
                author: detailedCommit.commit.author?.name || 'Неизвестный автор',
                date: detailedCommit.commit.author?.date || new Date().toISOString(),
                url: detailedCommit.html_url,
              },
            };
            
            // Отправляем уведомления с детальной информацией
            await this.sendNotification(notification, detailedCommit);
          } catch (error) {
            logger.error(`Error getting detailed commit info for ${commit.sha}:`, error);
            // Fallback к базовому уведомлению
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
            await this.sendNotification(notification, commit);
          }
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

  private async sendNotification(notification: NewCommitNotification, commit?: Commit): Promise<void> {
    try {
      // Получаем ИИ анализ если доступен детальный коммит и ИИ сервис
      let aiAnalysis;
      if (commit && this.aiAnalysisService) {
        try {
          aiAnalysis = await this.aiAnalysisService.analyzeCommit(commit);
        } catch (error) {
          logger.warn('AI analysis failed for notification, continuing without it:', error);
          aiAnalysis = undefined;
        }
      }

      const formattedMessage = this.formatNotification(notification, commit, aiAnalysis);
      
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

  private formatNotification(notification: NewCommitNotification, commit?: Commit, aiAnalysis?: any): string {
    const { subscription, commit: notificationCommit } = notification;
    const repoText = subscription.repo ? ` в репозитории \`${subscription.repo}\`` : '';
    
    // Используем детальный коммит если доступен, иначе базовый
    const commitToFormat = commit || {
      sha: notificationCommit.sha,
      commit: {
        message: notificationCommit.message,
        author: {
          name: notificationCommit.author,
          date: notificationCommit.date,
        },
      },
      html_url: notificationCommit.url,
    };
    
    return `🆕 **Новый коммит от ${subscription.username}${repoText}**

${this.formatter.formatCommit(commitToFormat, undefined, aiAnalysis)}`;
  }

  isMonitoringActive(): boolean {
    return this.isRunning;
  }
}
