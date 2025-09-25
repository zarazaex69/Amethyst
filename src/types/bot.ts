import { Context } from 'grammy';

export interface BotCommand {
  name: string;
  description: string;
  execute(ctx: Context): Promise<void>;
}

export interface UserPreferences {
  format: 'markdown' | 'html';
  showStats: boolean;
  maxCommits: number;
}

export interface CommandArgs {
  username: string;
  repo?: string;
}
