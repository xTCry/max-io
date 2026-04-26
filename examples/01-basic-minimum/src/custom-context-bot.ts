import 'dotenv/config';

import { Bot, Context } from 'max-io';

import { token } from './env';
import {
  registerExampleFallback,
  startExampleBot,
  syncExampleCommands,
} from './runtime';

const commands = [{ name: 'start', description: 'Say hello' }];

class CustomContext extends Context {
  reply(...options: Parameters<Context['reply']>) {
    console.log(`Reply to ${this.chatId} with options:`, options);
    return super.reply(...options);
  }
}

const bot = new Bot(token, { contextType: CustomContext });

registerExampleFallback(bot, {
  scenarioName: 'custom-context-bot',
  commands,
  fallbackLines: ['Напиши обычный текст или вызови /start, чтобы увидеть custom context в работе.'],
});

bot.command('start', (ctx) => {
  return ctx.reply('Hello!');
});

startExampleBot(bot, {
  scenarioName: 'custom-context-bot',
  commands,
  beforeStart: () => syncExampleCommands(bot, commands),
  fallbackLines: ['Напиши обычный текст или вызови /start, чтобы увидеть custom context в работе.'],
});
