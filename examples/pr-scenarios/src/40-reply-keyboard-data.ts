import 'dotenv/config';

import { Bot, Keyboard } from 'max-io';

import { token } from './env';
import {
  registerScenarioFallback,
  startScenarioBot,
  syncScenarioCommands,
} from './runtime';

const scenarioName = '40-reply-keyboard-data';

const commands = [
  {
    name: 'replyKeyboard',
    description: 'Send reply keyboard with message/contact/location buttons',
  },
];

const bot = new Bot(token);

registerScenarioFallback(bot, {
  scenarioName,
  commands,
  fallbackLines: [
    'Нажми кнопку reply keyboard и смотри в терминале attachments входящего сообщения.',
  ],
});

bot.command('replyKeyboard', async (ctx) => {
  return ctx.reply('Reply keyboard для ручной проверки:', {
    attachments: [
      Keyboard.replyKeyboard([
        [Keyboard.button.sendMessage('Payload message', 'reply:data:message')],
        [
          Keyboard.button.sendContact('Send contact', 'reply:data:contact'),
          Keyboard.button.sendGeoLocation('Send location', 'reply:data:geo'),
        ],
      ]),
      // Keyboard.inlineKeyboard([[Keyboard.button.message('Test')]]),
    ],
  });
});

bot.on('message_created', async (ctx, next) => {
  const text = ctx.message?.body?.text?.trim();
  const attachments = ctx.message?.body?.attachments ?? [];

  if (!text && attachments.length === 0) return next();

  console.log(`[${scenarioName}] MESSAGE_CREATED`);
  console.dir(
    {
      text,
      attachmentTypes: attachments.map((item) => item.type),
      attachments,
    },
    { depth: 10 },
  );

  const dataAttachments = attachments.filter((item) => item.type === 'data');

  if (dataAttachments.length > 0) {
    return ctx.reply(
      dataAttachments
        .map((item) => `Получен data payload: ${item.data}`)
        .join('\n'),
    );
  }

  return next();
});

startScenarioBot(bot, {
  scenarioName,
  commands,
  beforeStart: () => syncScenarioCommands(bot, commands),
  fallbackLines: [
    'Нажми кнопку reply keyboard и смотри в терминале attachments входящего сообщения.',
  ],
});
