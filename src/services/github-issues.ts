import { Octokit } from '@octokit/rest';
import { config } from '../config/env';
import { AIAnalysisService } from './ai-analysis';
import { SmartFormatter } from '../utils/formatter';
import { logger } from './logger';
import type { Commit } from '../types/github';

export interface IssueReview {
  title: string;
  body: string;
  labels: string[];
}

export class GitHubIssuesService {
  private octokit: Octokit;
  private aiAnalysisService: AIAnalysisService;
  private formatter: SmartFormatter;

  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
    });
    
    // Инициализируем ИИ сервис только если API ключ доступен
    try {
      this.aiAnalysisService = new AIAnalysisService();
    } catch (error) {
      logger.warn('AI Analysis service disabled for issues - ZhipuAI API key not configured');
      this.aiAnalysisService = null as any;
    }
    
    this.formatter = new SmartFormatter();
  }

  async createCommitReviewIssue(
    username: string, 
    repo: string, 
    commit: Commit, 
    autoCreate: boolean = false
  ): Promise<IssueReview> {
    try {
      // Получаем ИИ анализ коммита
      let aiAnalysis;
      if (this.aiAnalysisService) {
        try {
          aiAnalysis = await this.aiAnalysisService.analyzeCommit(commit);
        } catch (error) {
          logger.warn('AI analysis failed for issue creation:', error);
          aiAnalysis = undefined;
        }
      }

      // Создаем заголовок issue
      const title = this.generateIssueTitle(commit, aiAnalysis);
      
      // Создаем тело issue с подробным анализом
      const body = this.generateIssueBody(commit, aiAnalysis, autoCreate);
      
      // Определяем лейблы
      const labels = this.generateIssueLabels(commit, aiAnalysis);

      return {
        title,
        body,
        labels
      };
    } catch (error) {
      logger.error('Error creating commit review issue:', error);
      throw error;
    }
  }

  async createIssueInRepository(
    username: string, 
    repo: string, 
    issueReview: IssueReview
  ): Promise<string> {
    try {
      const { data: issue } = await this.octokit.issues.create({
        owner: username,
        repo,
        title: issueReview.title,
        body: issueReview.body,
        labels: issueReview.labels
      });

      logger.info(`Created issue #${issue.number} in ${username}/${repo}`);
      return issue.html_url;
    } catch (error) {
      logger.error('Error creating issue in repository:', error);
      throw error;
    }
  }

  private generateIssueTitle(commit: Commit, aiAnalysis?: any): string {
    const shortMessage = (commit.commit?.message || 'No message').split('\n')[0]?.substring(0, 60) || 'No message';
    const impact = aiAnalysis?.impact || 'medium';
    
    const impactEmoji = this.getImpactEmoji(impact);
    return `${impactEmoji} Code Review: ${shortMessage}${shortMessage.length >= 60 ? '...' : ''}`;
  }

  private generateIssueBody(commit: Commit, aiAnalysis?: any, autoCreate: boolean = false): string {
    const author = commit.commit.author?.name || 'Неизвестный автор';
    const date = new Date(commit.commit.author?.date || new Date()).toLocaleString('ru-RU');
    const shortSha = commit.sha.substring(0, 7);
    
    let body = `## 📝 Обзор коммита\n\n`;
    
    // Информация о коммите
    body += `**Автор:** ${author}\n`;
    body += `**Дата:** ${date}\n`;
    body += `**Хеш:** \`${shortSha}\`\n`;
    body += `**Ссылка:** [${commit.html_url}](${commit.html_url})\n\n`;
    
    // Сообщение коммита
    body += `### 💬 Сообщение коммита\n\n`;
    body += `\`\`\`\n${commit.commit.message}\n\`\`\`\n\n`;
    
    // ИИ анализ если доступен
    if (aiAnalysis) {
      body += `## 🤖 ИИ Анализ\n\n`;
      body += `### 📊 Краткое описание\n\n`;
      body += `${aiAnalysis.summary}\n\n`;
      
      body += `### 🎯 Воздействие и категории\n\n`;
      const impactEmoji = this.getImpactEmoji(aiAnalysis.impact);
      const categories = aiAnalysis.categories && aiAnalysis.categories.length > 0 
        ? ` • ${aiAnalysis.categories.join(', ')}` 
        : '';
      body += `${impactEmoji} **${this.getImpactText(aiAnalysis.impact)}**${categories}\n\n`;
      
      if (aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0) {
        body += `### 💡 Рекомендации\n\n`;
        aiAnalysis.suggestions.forEach((suggestion: string, index: number) => {
          body += `${index + 1}. ${suggestion}\n`;
        });
        body += `\n`;
      }
      
      if (aiAnalysis.technicalDetails) {
        body += `### 🔧 Технические детали\n\n`;
        body += `${aiAnalysis.technicalDetails}\n\n`;
      }
    }
    
    // Изменения в файлах
    if (commit.files && commit.files.length > 0) {
      body += `## 📁 Изменения в файлах\n\n`;
      body += `**Всего файлов:** ${commit.files.length}\n\n`;
      
      // Статистика изменений
      const totalAdditions = commit.files.reduce((sum, file) => sum + file.additions, 0);
      const totalDeletions = commit.files.reduce((sum, file) => sum + file.deletions, 0);
      body += `**Добавлено строк:** +${totalAdditions}\n`;
      body += `**Удалено строк:** -${totalDeletions}\n\n`;
      
      // Детали по файлам
      body += `### 📋 Детали изменений\n\n`;
      
      commit.files.forEach((file, index) => {
        const statusEmoji = this.getFileStatusEmoji(file.status);
        body += `#### ${index + 1}. ${statusEmoji} \`${file.filename}\`\n\n`;
        body += `- **Статус:** ${file.status}\n`;
        body += `- **Добавлено:** +${file.additions}\n`;
        body += `- **Удалено:** -${file.deletions}\n`;
        body += `- **Изменений:** ${file.changes}\n\n`;
        
        // Показываем patch если есть
        if (file.patch && file.patch.length > 0) {
          body += `\`\`\`diff\n${file.patch.substring(0, 2000)}${file.patch.length > 2000 ? '\n... (показаны первые 2000 символов)' : ''}\n\`\`\`\n\n`;
        }
      });
    }
    
    // Футер
    body += `---\n\n`;
    if (autoCreate) {
      body += `*Этот issue был создан автоматически системой мониторинга коммитов.*\n`;
    } else {
      body += `*Этот issue был создан вручную командой /comment.*\n`;
    }
    body += `*Для получения более подробной информации используйте команду /monit.*\n`;
    
    return body;
  }

  private generateIssueLabels(commit: Commit, aiAnalysis?: any): string[] {
    const labels = ['code-review', 'automated'];
    
    // Лейблы на основе ИИ анализа
    if (aiAnalysis) {
      labels.push(`impact-${aiAnalysis.impact}`);
      
      if (aiAnalysis.categories) {
        aiAnalysis.categories.forEach((category: string) => {
          labels.push(`category-${category.toLowerCase().replace(/\s+/g, '-')}`);
        });
      }
    }
    
    // Лейблы на основе изменений
    if (commit.files) {
      const hasNewFiles = commit.files.some(file => file.status === 'added');
      const hasDeletedFiles = commit.files.some(file => file.status === 'removed');
      const hasModifiedFiles = commit.files.some(file => file.status === 'modified');
      
      if (hasNewFiles) labels.push('new-files');
      if (hasDeletedFiles) labels.push('deleted-files');
      if (hasModifiedFiles) labels.push('modified-files');
    }
    
    return labels;
  }

  private getImpactEmoji(impact: string): string {
    switch (impact) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  }

  private getImpactText(impact: string): string {
    switch (impact) {
      case 'low': return 'Низкое';
      case 'medium': return 'Среднее';
      case 'high': return 'Высокое';
      default: return 'Неизвестно';
    }
  }

  private getFileStatusEmoji(status: string): string {
    switch (status) {
      case 'added': return '➕';
      case 'removed': return '➖';
      case 'modified': return '✏️';
      case 'renamed': return '🔄';
      case 'copied': return '📋';
      default: return '📄';
    }
  }
}
