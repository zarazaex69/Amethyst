import { ZhipuAI } from 'zhipuai';
import { config } from '../config/env';
import { logger } from './logger';
import type { Commit, CommitFile } from '../types/github';

export interface AIAnalysisResult {
  summary: string;
  impact: 'low' | 'medium' | 'high';
  categories: string[];
  suggestions?: string[];
  technicalDetails?: string;
}

export class AIAnalysisService {
  private zhipuai: ZhipuAI;

  constructor() {
    if (!config.zhipuai.apiKey) {
      throw new Error('ZhipuAI API key is not configured');
    }
    
    this.zhipuai = new ZhipuAI({
      apiKey: config.zhipuai.apiKey,
      baseURL: config.zhipuai.baseUrl,
    });
  }

  async analyzeCommit(commit: Commit): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(commit);
      
      const response = await this.zhipuai.chat.completions.create({
        model: 'glm-4',
        messages: [
          {
            role: 'system',
            content: 'Ты - эксперт по анализу кода и изменений в репозиториях. Анализируй коммиты и предоставляй структурированную информацию о них.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const analysisText = response.choices[0]?.message?.content || '';
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      logger.error('AI analysis error:', error);
      return this.getFallbackAnalysis(commit);
    }
  }

  private buildAnalysisPrompt(commit: Commit): string {
    const message = commit.commit.message;
    const author = commit.commit.author?.name || 'Неизвестный автор';
    const files = commit.files || [];
    
    let prompt = `Анализируй следующий коммит:\n\n`;
    prompt += `Сообщение коммита: ${message}\n`;
    prompt += `Автор: ${author}\n`;
    prompt += `Количество файлов: ${files.length}\n\n`;

    if (files.length > 0) {
      prompt += `Изменения в файлах:\n`;
      files.slice(0, 10).forEach((file, index) => {
        prompt += `${index + 1}. ${file.filename} (${file.status})\n`;
        if (file.additions > 0) prompt += `   +${file.additions} строк добавлено\n`;
        if (file.deletions > 0) prompt += `   -${file.deletions} строк удалено\n`;
        if (file.changes > 0) prompt += `   ${file.changes} изменений\n`;
      });
    }

    prompt += `\nПредоставь анализ в следующем формате JSON:\n`;
    prompt += `{\n`;
    prompt += `  "summary": "Краткое описание изменений (1-2 предложения)",\n`;
    prompt += `  "impact": "low|medium|high",\n`;
    prompt += `  "categories": ["список", "категорий", "изменений"],\n`;
    prompt += `  "suggestions": ["полезные", "предложения", "если", "есть"],\n`;
    prompt += `  "technicalDetails": "Технические детали изменений"\n`;
    prompt += `}`;

    return prompt;
  }

  private parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        return {
          summary: parsed.summary || 'Анализ недоступен',
          impact: parsed.impact || 'medium',
          categories: parsed.categories || ['общие изменения'],
          suggestions: parsed.suggestions,
          technicalDetails: parsed.technicalDetails,
        };
      }
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON:', error);
    }

    // Fallback - возвращаем базовую информацию
    return {
      summary: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
      impact: 'medium',
      categories: ['анализ ИИ'],
      technicalDetails: response,
    };
  }

  private getFallbackAnalysis(commit: Commit): AIAnalysisResult {
    const message = commit.commit.message;
    const files = commit.files || [];
    
    let summary = `Коммит: ${message}`;
    if (files.length > 0) {
      const totalChanges = files.reduce((sum, file) => sum + file.changes, 0);
      summary += ` (${totalChanges} изменений в ${files.length} файлах)`;
    }

    return {
      summary,
      impact: files.length > 5 ? 'high' : files.length > 2 ? 'medium' : 'low',
      categories: ['коммит', 'изменения'],
      technicalDetails: `Анализ недоступен. Коммит содержит ${files.length} файлов.`,
    };
  }

  async analyzeMultipleCommits(commits: Commit[]): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = [];
    
    // Ограничиваем количество коммитов для анализа
    const commitsToAnalyze = commits.slice(0, 5);
    
    for (const commit of commitsToAnalyze) {
      try {
        const analysis = await this.analyzeCommit(commit);
        results.push(analysis);
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`Error analyzing commit ${commit.sha}:`, error);
        results.push(this.getFallbackAnalysis(commit));
      }
    }
    
    return results;
  }
}
