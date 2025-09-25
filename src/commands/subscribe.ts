import { Context } from 'grammy';
import { SubscriptionService } from '../services/subscription';
import { Validator } from '../utils/validator';
import { logger } from '../services/logger';

export class SubscribeCommand {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const args = ctx.message?.text?.split(' ').slice(1);
      
      if (!args || args.length === 0) {
        await ctx.reply('❌ Пожалуйста, укажите имя пользователя GitHub.\n\nИспользование: `/subscribe <username> [repo]`');
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
        const subscription = await this.subscriptionService.subscribe(userId, username, repo);
        
        const repoText = repo ? ` репозитория \`${repo}\`` : '';
        await ctx.reply(
          `✅ **Подписка активирована!**\n\n` +
          `👤 **Пользователь:** ${username}\n` +
          `📁 **Репозиторий:** ${repoText || 'все репозитории'}\n\n` +
          `Теперь вы будете получать уведомления о новых коммитах.`
        );

        logger.info(`User ${userId} subscribed to ${username}${repo ? `/${repo}` : ''}`);
      } catch (error) {
        if (error instanceof Error && error.message === 'Подписка уже активна') {
          await ctx.reply('⚠️ Подписка на этого пользователя уже активна.');
        } else {
          logger.error('Subscribe command error:', error);
          await ctx.reply('❌ Произошла ошибка при создании подписки.');
        }
      }

    } catch (error) {
      logger.error('Subscribe command error:', error);
      await ctx.reply('❌ Произошла ошибка при обработке команды.');
    }
  }
}
