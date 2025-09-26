import { Context } from 'grammy';
import { SubscriptionService } from '../services/subscription';
import { logger } from '../services/logger';

export class SubscriptionsCommand {
  private subscriptionService: SubscriptionService;

  constructor(subscriptionService?: SubscriptionService) {
    this.subscriptionService = subscriptionService || new SubscriptionService();
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply('❌ Не удалось определить ваш ID пользователя.');
        return;
      }

      const subscriptions = await this.subscriptionService.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        await ctx.reply(
          '📭 **У вас нет активных подписок**\n\n' +
          'Используйте команду `/subscribe <username> [repo]` для подписки на уведомления о новых коммитах.'
        );
        return;
      }

      let message = `📋 **Ваши активные подписки (${subscriptions.length}):**\n\n`;
      
      subscriptions.forEach((sub, index) => {
        const repoText = sub.repo ? `/${sub.repo}` : '';
        const lastCheck = new Date(sub.lastCheckTime).toLocaleString('ru-RU');
        
        message += `${index + 1}. 👤 **${sub.username}${repoText}**\n`;
        message += `   📅 Последняя проверка: ${lastCheck}\n`;
        if (sub.lastCommitSha) {
          message += `   🔗 Последний коммит: \`${sub.lastCommitSha.substring(0, 7)}\`\n`;
        }
        message += '\n';
      });

      message += '💡 Используйте `/unsubscribe <username> [repo]` для отмены подписки.';

      await ctx.reply(message);

    } catch (error) {
      logger.error('Subscriptions command error:', error);
      await ctx.reply('❌ Произошла ошибка при получении списка подписок.');
    }
  }
}
