import { Context } from 'grammy';
import { MESSAGES } from '../config/constants';

export class StartCommand {
  async execute(ctx: Context): Promise<void> {
    await ctx.reply(MESSAGES.WELCOME);
  }
}
