import type { Commit, CommitFile } from '../types/github';
import type { UserPreferences } from '../types/bot';
import { DIFF_CONFIG } from '../config/constants';

export class SmartFormatter {
  formatCommit(commit: Commit, preferences?: UserPreferences): string {
    const message = this.truncateMessage(commit.commit.message);
    const author = commit.commit.author?.name || 'Неизвестный автор';
    const date = this.formatDate(commit.commit.author?.date || new Date().toISOString());
    const url = commit.html_url;
    const shortSha = commit.sha.substring(0, 7);

    const format = preferences?.format || 'markdown';
    
    // Добавляем diff если есть файлы
    const diffSection = this.formatDiff(commit.files);
    
    if (format === 'html') {
      return this.formatAsHTML(message, author, date, url, shortSha) + diffSection;
    }
    
    return this.formatAsMarkdown(message, author, date, url, shortSha) + diffSection;
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

  private formatDiff(files?: CommitFile[]): string {
    if (!files || files.length === 0) {
      return '';
    }

    // Сортируем файлы по количеству изменений (топ файлы)
    const sortedFiles = files
      .filter(file => file.status !== 'unchanged')
      .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
      .slice(0, DIFF_CONFIG.MAX_FILES);

    if (sortedFiles.length === 0) {
      return '';
    }

    let diffText = '\n\n📝 **Изменения:**\n';
    let totalLines = 0;

    for (const file of sortedFiles) {
      if (totalLines >= DIFF_CONFIG.MAX_TOTAL_LINES) {
        diffText += `\n... и еще ${files.length - sortedFiles.indexOf(file)} файлов`;
        break;
      }

      const fileStatus = this.getFileStatusEmoji(file.status);
      diffText += `\n\`\`\`${file.filename}\n`;
      
      if (file.patch) {
        const patchLines = file.patch.split('\n');
        const limitedLines = patchLines.slice(0, DIFF_CONFIG.MAX_LINES_PER_FILE);
        
        for (const line of limitedLines) {
          if (totalLines >= DIFF_CONFIG.MAX_TOTAL_LINES) {
            diffText += '...\n';
            break;
          }
          
          if (line.startsWith('+')) {
            diffText += `+ ${line.substring(1)}\n`;
          } else if (line.startsWith('-')) {
            diffText += `- ${line.substring(1)}\n`;
          } else if (line.startsWith('@@')) {
            diffText += `${line}\n`;
          } else if (line.trim() !== '') {
            diffText += `  ${line}\n`;
          }
          totalLines++;
        }
        
        if (patchLines.length > DIFF_CONFIG.MAX_LINES_PER_FILE) {
          diffText += '...\n';
        }
      } else {
        // Если нет patch, показываем статистику
        diffText += `${fileStatus} ${file.additions > 0 ? `+${file.additions}` : ''}${file.deletions > 0 ? ` -${file.deletions}` : ''}\n`;
      }
      
      diffText += '```';
    }

    return diffText;
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
