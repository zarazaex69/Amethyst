import { Octokit } from '@octokit/rest';
import { config } from '../config/env';
import type { Commit, GitHubUser, GitHubRepo } from '../types/github';
import { GITHUB_API } from '../config/constants';

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
    });
  }

  async getLatestCommits(username: string, repo?: string | undefined): Promise<Commit[]> {
    try {
      if (repo && repo !== 'undefined') {
        const { data } = await this.octokit.repos.listCommits({
          owner: username,
          repo,
          per_page: GITHUB_API.PER_PAGE,
        });
        return data as Commit[];
      } else {
        // Получаем последние коммиты из всех репозиториев
        const { data: repos } = await this.octokit.repos.listForUser({
          username,
          per_page: GITHUB_API.MAX_REPOS,
          sort: 'updated',
        });

        // Фильтруем репозитории - исключаем пустые и форки
        const activeRepos = repos.filter(repo => 
          !repo.fork && 
          repo.size > 0 && 
          repo.updated_at && 
          new Date(repo.updated_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Активны за последний год
        );

        if (activeRepos.length === 0) {
          console.warn(`No active repositories found for user ${username}`);
          return [];
        }

        const commits = await Promise.all(
          activeRepos.map(async (repository) => {
            try {
              const { data } = await this.octokit.repos.listCommits({
                owner: username,
                repo: repository.name,
                per_page: 1,
              });
              return data[0];
            } catch (error: any) {
              // Игнорируем ошибки пустых репозиториев и других проблем
              if (error.status === 409 && error.message?.includes('Git Repository is empty')) {
                console.warn(`Repository ${repository.name} is empty, skipping...`);
              } else {
                console.warn(`Failed to get commits from ${repository.name}:`, error.message || error);
              }
              return null;
            }
          })
        );

        return commits.filter(Boolean) as Commit[];
      }
    } catch (error: any) {
      console.error('GitHub API error:', error);
      
      // Если это ошибка 404 (пользователь не найден), возвращаем пустой массив
      if (error.status === 404) {
        console.warn(`User ${username} not found`);
        return [];
      }
      
      // Если это ошибка 403 (доступ запрещен), возвращаем пустой массив
      if (error.status === 403) {
        console.warn(`Access denied for user ${username}`);
        return [];
      }
      
      throw new Error(`GitHub API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCommitWithFiles(username: string, repo: string, sha: string): Promise<Commit> {
    try {
      const { data } = await this.octokit.repos.getCommit({
        owner: username,
        repo,
        ref: sha,
      });
      return data as Commit;
    } catch (error) {
      console.error('GitHub API error:', error);
      throw new Error(`Failed to get commit details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserInfo(username: string): Promise<GitHubUser> {
    try {
      const { data } = await this.octokit.users.getByUsername({
        username,
      });
      return data as GitHubUser;
    } catch (error) {
      console.error('GitHub API error:', error);
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserRepos(username: string): Promise<GitHubRepo[]> {
    try {
      const { data } = await this.octokit.repos.listForUser({
        username,
        per_page: GITHUB_API.MAX_REPOS,
        sort: 'updated',
      });
      return data as GitHubRepo[];
    } catch (error) {
      console.error('GitHub API error:', error);
      throw new Error(`Failed to get user repos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
