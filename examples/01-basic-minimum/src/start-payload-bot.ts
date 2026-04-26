import 'dotenv/config';

import { Bot } from 'max-io';

import { token } from './env';
import {
  registerExampleFallback,
  startExampleBot,
  syncExampleCommands,
} from './runtime';

const commands: Array<{ name: string; description?: string | null }> = [];

const bot = new Bot(token);

registerExampleFallback(bot, {
  scenarioName: 'start-payload-bot',
  commands,
  fallbackLines: [
    'Открой бота по deep link с start payload, чтобы получить событие bot_started.',
  ],
});

bot.on('bot_started', async (ctx) => {
  return ctx.reply(`Bot started with payload: ${ctx.startPayload}`);
});

startExampleBot(bot, {
  scenarioName: 'start-payload-bot',
  commands,
  beforeStart: () => syncExampleCommands(bot, commands),
  fallbackLines: [
    'Открой бота по deep link с start payload, чтобы получить событие bot_started.',
  ],
});
