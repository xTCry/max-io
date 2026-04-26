import 'dotenv/config';

import fs from 'node:fs';

import {
  Bot,
  ImageAttachment,
  LocationAttachment,
  StickerAttachment,
} from 'max-io';

import { imageToken, imageUrl, stickerCode, token } from './env';
import { publicPath } from './paths';
import {
  registerExampleFallback,
  startExampleBot,
  syncExampleCommands,
} from './runtime';

const commands = [
  { name: 'local', description: 'Send local video' },
  { name: 'url', description: 'Send image from url' },
  { name: 'stream', description: 'Send audio from stream' },
  { name: 'buffer', description: 'Send file from buffer' },
  { name: 'album', description: 'Send photo album' },
  { name: 'sticker', description: 'Send sticker' },
  { name: 'location', description: 'Send random location' },
];

const bot = new Bot(token);

registerExampleFallback(bot, {
  scenarioName: 'attachments-bot',
  commands,
  fallbackLines: ['Отправь одну из команд выше, чтобы проверить загрузку вложений.'],
});

bot.command('local', async (ctx) => {
  const video = await ctx.api.uploadVideo({
    source: `${publicPath}/video.mp4`,
  });
  return ctx.reply('', { attachments: [video.toJson()] });
});

bot.command('url', async (ctx) => {
  const image = await ctx.api.uploadImage({ url: imageUrl });
  return ctx.reply('', { attachments: [image.toJson()] });
});

bot.command('stream', async (ctx) => {
  const audio = await ctx.api.uploadAudio({
    source: fs.createReadStream(`${publicPath}/audio.mp3`),
  });
  return ctx.reply('', { attachments: [audio.toJson()] });
});

bot.command('buffer', async (ctx) => {
  const file = await ctx.api.uploadFile({
    source: fs.readFileSync(`${publicPath}/image.png`),
  });
  return ctx.reply('', { attachments: [file.toJson()] });
});

bot.command('album', async (ctx) => {
  const attachments = [
    (await ctx.api.uploadImage({ url: imageUrl })).toJson(),
    (
      await ctx.api.uploadImage({
        source: fs.readFileSync(`${publicPath}/image.png`),
      })
    ).toJson(),
  ];

  if (imageToken) {
    attachments.push(new ImageAttachment({ token: imageToken }).toJson());
  }

  return ctx.reply('', { attachments });
});

bot.command('sticker', (ctx) => {
  return ctx.reply('', {
    attachments: [new StickerAttachment({ code: stickerCode }).toJson()],
  });
});

bot.command('location', (ctx) => {
  const lat = getRandomInRange(-180, 180, 3);
  const lon = getRandomInRange(-180, 180, 3);
  return ctx.reply(`${lat}, ${lon}`, {
    attachments: [new LocationAttachment({ lat, lon }).toJson()],
  });
});

startExampleBot(bot, {
  scenarioName: 'attachments-bot',
  commands,
  beforeStart: () => syncExampleCommands(bot, commands),
  fallbackLines: ['Отправь одну из команд выше, чтобы проверить загрузку вложений.'],
});

function getRandomInRange(from: number, to: number, fixed = 0) {
  return Number((Math.random() * (to - from) + from).toFixed(fixed));
}
