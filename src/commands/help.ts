import { Context } from 'grammy';
import { MESSAGES } from '../config/constants';

export class HelpCommand {
  async execute(ctx: Context): Promise<void> {
    await ctx.reply(MESSAGES.HELP, { parse_mode: 'Markdown' });
  }
}
