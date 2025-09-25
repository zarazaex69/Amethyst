import type { Commit } from '../types/github';
import type { UserPreferences } from '../types/bot';

export class SmartFormatter {
  formatCommit(commit: Commit, preferences?: UserPreferences): string {
    const message = this.truncateMessage(commit.commit.message);
    const author = commit.commit.author?.name || 'Неизвестный автор';
    const date = this.formatDate(commit.commit.author?.date || new Date().toISOString());
    const url = commit.html_url;
    const shortSha = commit.sha.substring(0, 7);

    const format = preferences?.format || 'markdown';
    
    if (format === 'html') {
      return this.formatAsHTML(message, author, date, url, shortSha);
    }
    
    return this.formatAsMarkdown(message, author, date, url, shortSha);
  }

  private formatAsMarkdown(message: string, author: string, date: string, url: string, shortSha: string): string {
    return `🔍 **${message}**

👤 **Автор:** ${author}
📅 **Дата:** ${date}
🔗 **Ссылка:** [Открыть на GitHub](${url})
 **Хеш:** \`${shortSha}\``;
  }

  private formatAsHTML(message: string, author: string, date: string, url: string, shortSha: string): string {
    return `🔍 <b>${message}</b>

👤 <b>Автор:</b> ${author}
📅 <b>Дата:</b> ${date}
🔗 <b>Ссылка:</b> <a href="${url}">Открыть на GitHub</a>
 <b>Хеш:</b> <code>${shortSha}</code>`;
  }

  private truncateMessage(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatError(error: string): string {
    return `❌ **Ошибка:** ${error}`;
  }

  formatLoading(): string {
    return ' Получаю последние коммиты...';
  }

  formatNoCommits(): string {
    return '📭 Коммиты не найдены.';
  }
}
