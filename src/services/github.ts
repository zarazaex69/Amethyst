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
        });

        const commits = await Promise.all(
          repos.map(async (repository) => {
            try {
              const { data } = await this.octokit.repos.listCommits({
                owner: username,
                repo: repository.name,
                per_page: 1,
              });
              return data[0];
            } catch (error) {
              console.warn(`Failed to get commits from ${repository.name}:`, error);
              return null;
            }
          })
        );

        return commits.filter(Boolean) as Commit[];
      }
    } catch (error) {
      console.error('GitHub API error:', error);
      throw new Error(`GitHub API error: ${error instanceof Error ? error.message : String(error)}`);
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
