import { Context } from 'grammy';
import { GitHubService } from '../../services/github';
import { SmartFormatter } from '../../utils/formatter';
import { Validator } from '../../utils/validator';
import { MESSAGES } from '../../config/constants';
import { logger } from '../../services/logger';

export class MonitCommand {
  private githubService: GitHubService;
  private formatter: SmartFormatter;

  constructor() {
    this.githubService = new GitHubService();
    this.formatter = new SmartFormatter();
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const args = ctx.message?.text?.split(' ').slice(1);
      
      // Валидация аргументов
      const validation = Validator.validateCommandArgs(args || []);
      if (!validation.isValid) {
        await ctx.reply(validation.error!);
        return;
      }

      const [username, repo] = args || [];
      
      // Показываем индикатор загрузки
      await ctx.reply(MESSAGES.LOADING);

      logger.info(`Getting commits for user: ${username}, repo: ${repo || 'all'}`);

      // Получаем коммиты
      const commits = await this.githubService.getLatestCommits(username!, repo);
      
      if (commits.length === 0) {
        await ctx.reply(MESSAGES.NO_COMMITS);
        return;
      }

      logger.info(`Found ${commits.length} commits`);

      // Отправляем каждый коммит отдельным сообщением
      for (const commit of commits) {
        try {
          const formattedMessage = this.formatter.formatCommit(commit);
          await ctx.reply(formattedMessage, { parse_mode: 'Markdown' });
        } catch (error) {
          logger.error('Error formatting commit:', error);
          // Fallback к простому формату
          await ctx.reply(`📝 ${commit.commit.message}\n👤 ${commit.commit.author?.name || 'Неизвестный автор'}\n🔗 ${commit.html_url}`);
        }
      }

    } catch (error) {
      logger.error('Monit command error:', error);
      await ctx.reply(MESSAGES.ERROR);
    }
  }
}
