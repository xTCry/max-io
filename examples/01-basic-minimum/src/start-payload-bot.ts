import { Bot } from 'max-io';

import { token } from './env';

const bot = new Bot(token);

bot.on('bot_started', async (ctx) => {
  return ctx.reply(`Bot started with payload: ${ctx.startPayload}`);
});

void bot.start();
