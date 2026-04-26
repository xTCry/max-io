import { Bot, Context } from 'max-io';

import { token } from './env';

class CustomContext extends Context {
  reply(...options: Parameters<Context['reply']>) {
    console.log(`Reply to ${this.chatId} with options:`, options);
    return super.reply(...options);
  }
}

const bot = new Bot(token, { contextType: CustomContext });

void bot.api.setMyCommands([
  { name: 'start', description: 'Say hello' },
]);

bot.command('start', (ctx) => {
  return ctx.reply('Hello!');
});

void bot.start();
