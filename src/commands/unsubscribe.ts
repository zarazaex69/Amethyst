import { Context } from 'grammy';
import { SubscriptionService } from '../services/subscription';
import { Validator } from '../utils/validator';
import { logger } from '../services/logger';

export class UnsubscribeCommand {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const args = ctx.message?.text?.split(' ').slice(1);
      
      if (!args || args.length === 0) {
        await ctx.reply('❌ Пожалуйста, укажите имя пользователя GitHub.\n\nИспользование: `/unsubscribe <username> [repo]`');
        return;
      }

      const [username, repo] = args;
      
      // Валидация имени пользователя
      if (!username || !Validator.validateUsername(username)) {
        await ctx.reply('❌ Неверное имя пользователя GitHub.');
        return;
      }

      // Валидация имени репозитория (если указан)
      if (repo && !Validator.validateRepoName(repo)) {
        await ctx.reply('❌ Неверное имя репозитория.');
        return;
      }

      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply('❌ Не удалось определить ваш ID пользователя.');
        return;
      }

      try {
        const success = await this.subscriptionService.unsubscribe(userId, username, repo);
        
        if (success) {
          const repoText = repo ? ` репозитория \`${repo}\`` : '';
          await ctx.reply(
            `✅ **Подписка отменена!**\n\n` +
            `👤 **Пользователь:** ${username}\n` +
            `📁 **Репозиторий:** ${repoText || 'все репозитории'}\n\n` +
            `Вы больше не будете получать уведомления о коммитах этого пользователя.`
          );

          logger.info(`User ${userId} unsubscribed from ${username}${repo ? `/${repo}` : ''}`);
        } else {
          await ctx.reply('⚠️ Подписка на этого пользователя не найдена.');
        }
      } catch (error) {
        logger.error('Unsubscribe command error:', error);
        await ctx.reply('❌ Произошла ошибка при отмене подписки.');
      }

    } catch (error) {
      logger.error('Unsubscribe command error:', error);
      await ctx.reply('❌ Произошла ошибка при обработке команды.');
    }
  }
}
