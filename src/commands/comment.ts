import { Context } from 'grammy';
import { GitHubService } from '../services/github';
import { GitHubIssuesService } from '../services/github-issues';
import { Validator } from '../utils/validator';
import { MESSAGES } from '../config/constants';
import { logger } from '../services/logger';

export class CommentCommand {
  private githubService: GitHubService;
  private issuesService: GitHubIssuesService;

  constructor() {
    this.githubService = new GitHubService();
    this.issuesService = new GitHubIssuesService();
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const args = ctx.message?.text?.split(' ').slice(1);
      
      // Валидация аргументов
      if (!args || args.length < 2) {
        await ctx.reply(
          '❌ Неверное использование команды.\n\n' +
          '**Использование:** `/comment <username> <repo> [commit_sha]`\n\n' +
          '**Примеры:**\n' +
          '• `/comment octocat Hello-World` - создать ревью для последнего коммита\n' +
          '• `/comment octocat Hello-World a1b2c3d` - создать ревью для конкретного коммита'
        );
        return;
      }

      const [username, repo, commitSha] = args;
      
      // Валидация имени пользователя
      if (!username || !Validator.validateUsername(username)) {
        await ctx.reply('❌ Неверное имя пользователя GitHub.');
        return;
      }

      // Валидация имени репозитория
      if (!repo || !Validator.validateRepoName(repo)) {
        await ctx.reply('❌ Неверное имя репозитория.');
        return;
      }

      // Показываем индикатор загрузки
      await ctx.reply('🔄 Создаю подробное ИИ ревью коммита...');

      logger.info(`Creating comment review for ${username}/${repo}, commit: ${commitSha || 'latest'}`);

      let commit;
      
      if (commitSha) {
        // Получаем конкретный коммит
        try {
          commit = await this.githubService.getCommitWithFiles(username!, repo!, commitSha!);
        } catch (error) {
          await ctx.reply(`❌ Коммит \`${commitSha}\` не найден в репозитории \`${username}/${repo}\`.`);
          return;
        }
      } else {
        // Получаем последний коммит
        try {
          const commits = await this.githubService.getLatestCommits(username!, repo!);
          if (commits.length === 0) {
            await ctx.reply(`❌ В репозитории \`${username}/${repo}\` не найдено коммитов.`);
            return;
          }
          commit = commits[0];
          
          // Получаем детальную информацию
          if (commit) {
            commit = await this.githubService.getCommitWithFiles(username!, repo!, commit.sha);
          }
        } catch (error) {
          await ctx.reply(`❌ Не удалось получить коммиты из репозитория \`${username}/${repo}\`.`);
          return;
        }
      }

      // Создаем ревью
      if (!commit) {
        await ctx.reply('❌ Не удалось получить информацию о коммите.');
        return;
      }

      try {
        const issueReview = await this.issuesService.createCommitReviewIssue(username!, repo!, commit, false);
        
        // Создаем issue в репозитории
        const issueUrl = await this.issuesService.createIssueInRepository(username!, repo!, issueReview);
        
        // Отправляем результат
        await ctx.reply(
          `✅ **ИИ ревью создано!**\n\n` +
          `📝 **Коммит:** \`${commit.sha.substring(0, 7)}\`\n` +
          `📁 **Репозиторий:** \`${username}/${repo}\`\n` +
          `🔗 **Issue:** [Открыть ревью](${issueUrl})\n\n` +
          `*Подробный анализ с ИИ рекомендациями создан в GitHub Issues.*`
        );

        logger.info(`Successfully created comment review for ${username}/${repo}/${commit.sha}`);
      } catch (error) {
        logger.error('Error creating comment review:', error);
        await ctx.reply('❌ Произошла ошибка при создании ревью. Проверьте права доступа к репозиторию.');
      }

    } catch (error) {
      logger.error('Comment command error:', error);
      await ctx.reply('❌ Произошла ошибка при обработке команды.');
    }
  }
}
