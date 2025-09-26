export interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name?: string;
      date?: string;
    } | null;
  };
  html_url: string;
  stats?: {
    additions?: number;
    deletions?: number;
    total?: number;
  };
  files?: CommitFile[];
}

export interface CommitFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  patch?: string;
}

export interface GitHubUser {
  login: string;
  name?: string | null;
  avatar_url: string;
  public_repos: number;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description?: string | null;
  html_url: string;
  updated_at: string | null | undefined;
  fork?: boolean;
  size?: number;
}
