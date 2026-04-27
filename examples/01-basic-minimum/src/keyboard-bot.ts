import 'dotenv/config';

import { Bot, Keyboard } from 'max-io';

import { token } from './env';
import {
  registerExampleFallback,
  startExampleBot,
  syncExampleCommands,
} from './runtime';

const commands = [
  { name: 'callback', description: 'Send callback keyboard' },
  { name: 'geoLocation', description: 'Send geoLocation request' },
  { name: 'contact', description: 'Send contact request' },
  { name: 'extraButtons', description: 'Send message and clipboard buttons' },
];

const bot = new Bot(token);

const defaultKeyboard = [
  [Keyboard.button.link('❤️', 'https://dev.max.ru/')],
  [
    Keyboard.button.callback('Remove message', 'remove_message', {
      intent: 'negative',
    }),
  ],
];

bot.action('remove_message', async (ctx) => {
  const result = await ctx.deleteMessage();
  await ctx.answerOnCallback({
    notification: result.success
      ? 'Successfully removed message'
      : 'Failed to remove message',
  });
});

const callbackKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('default', 'color:default'),
    Keyboard.button.callback('positive', 'color:positive', {
      intent: 'positive',
    }),
    Keyboard.button.callback('negative', 'color:negative', {
      intent: 'negative',
    }),
  ],
  ...defaultKeyboard,
]);

bot.command('callback', (ctx) => {
  return ctx.reply('Callback keyboard', { attachments: [callbackKeyboard] });
});

bot.action(/color:(.+)/, async (ctx) => {
  return ctx.answerOnCallback({
    message: {
      text: `Your choice: ${ctx.match?.[1]} color`,
      attachments: [],
    },
  });
});

bot.command('geoLocation', async (ctx) => {
  return ctx.reply('GeoLocation keyboard', {
    attachments: [
      Keyboard.inlineKeyboard([
        [Keyboard.button.requestGeoLocation('Send geoLocation')],
        ...defaultKeyboard,
      ]),
    ],
  });
});

bot.on('message_created', async (ctx, next) => {
  if (!ctx.location) return next();
  return ctx.reply(
    `Your location: ${ctx.location.latitude}, ${ctx.location.longitude}`,
  );
});

bot.command('contact', async (ctx) => {
  return ctx.reply('Contact keyboard', {
    attachments: [
      Keyboard.inlineKeyboard([
        [Keyboard.button.requestContact('Send my contact')],
        ...defaultKeyboard,
      ]),
    ],
  });
});

bot.on('message_created', async (ctx, next) => {
  if (!ctx.contactInfo) return next();
  return ctx.reply(
    `Your name: ${ctx.contactInfo.fullName}\nYour phone: ${ctx.contactInfo.tel}`,
  );
});

bot.command('extraButtons', async (ctx) => {
  return ctx.reply('Message and clipboard keyboard', {
    attachments: [
      Keyboard.inlineKeyboard([
        [Keyboard.button.message('Hello from message button')],
        [Keyboard.button.clipboard('Copy text', 'Clipboard text')],
        ...defaultKeyboard,
      ]),
    ],
  });
});

bot.hears('Hello from message button', async (ctx) => {
  return ctx.reply('Received text from message button.');
});

registerExampleFallback(bot, {
  scenarioName: 'keyboard-bot',
  commands,
  fallbackLines: [
    'Напиши обычный текст, если хочешь снова увидеть список клавиатурных команд.',
  ],
});

startExampleBot(bot, {
  scenarioName: 'keyboard-bot',
  commands,
  beforeStart: () => syncExampleCommands(bot, commands),
  fallbackLines: [
    'Напиши обычный текст, если хочешь снова увидеть список клавиатурных команд.',
  ],
});
