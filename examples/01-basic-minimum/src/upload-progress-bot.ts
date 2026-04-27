import 'dotenv/config';

import { type Api, Bot } from 'max-io';

import { token } from './env';
import { publicPath } from './paths';
import {
  registerExampleFallback,
  startExampleBot,
  syncExampleCommands,
} from './runtime';

const commands = [
  { name: 'upload', description: 'Start upload with progress' },
  { name: 'cancelUpload', description: 'Cancel active upload' },
];

const bot = new Bot(token);
const uploadVideoPath = `${publicPath}/video.mp4`;
let currentUploadController: AbortController | null = null;

registerExampleFallback(bot, {
  scenarioName: 'upload-progress-bot',
  commands,
  fallbackLines: [
    'Отправь /upload, чтобы начать загрузку видео, или /cancelUpload, чтобы прервать её.',
    'Прогресс и состояние загрузки печатаются в консоль.',
  ],
});

bot.command('upload', async (ctx) => {
  if (currentUploadController) {
    await ctx.reply(
      'Сейчас уже идёт загрузка файла. Дождись завершения или используй /cancelUpload.',
    );
    return;
  }

  if (ctx.chatId === undefined) {
    throw new TypeError('chatId is not available for upload command');
  }

  const controller = new AbortController();
  currentUploadController = controller;

  console.log('[upload-progress-bot] Начинаю загрузку видео', uploadVideoPath);
  await ctx.reply(
    'Начинаю загрузку видео. Для отмены используй /cancelUpload.',
  );

  // Не ждём upload внутри middleware, чтобы long polling не блокировал
  // обработку следующих команд, например /cancelUpload.
  void runUploadJob({
    api: ctx.api,
    chatId: ctx.chatId,
    controller,
  });
});

bot.command('cancelUpload', async (ctx) => {
  if (!currentUploadController) {
    await ctx.reply('Сейчас нет активной загрузки.');
    return;
  }

  currentUploadController.abort();
  await ctx.reply('Отправил запрос на отмену загрузки.');
});

startExampleBot(bot, {
  scenarioName: 'upload-progress-bot',
  commands,
  beforeStart: () => syncExampleCommands(bot, commands),
  fallbackLines: [
    'Отправь /upload, чтобы начать загрузку видео, или /cancelUpload, чтобы прервать её.',
    'Прогресс и состояние загрузки печатаются в консоль.',
  ],
});

type RunUploadJobOptions = {
  api: Api;
  chatId: number;
  controller: AbortController;
};

async function runUploadJob({ api, chatId, controller }: RunUploadJobOptions) {
  let lastLoggedPercent = -1;

  try {
    const video = await api.uploadVideo({
      source: uploadVideoPath,
      signal: controller.signal,
      onProgress: ({ phase, loaded, total, mode, fileName }) => {
        if (phase === 'prepare') {
          console.log('[upload-progress-bot] PREPARE', {
            mode,
            fileName,
            total,
          });
          return;
        }

        if (phase === 'complete') {
          console.log('[upload-progress-bot] COMPLETE', {
            mode,
            fileName,
            loaded,
            total,
          });
          return;
        }

        if (!total || total <= 0) {
          console.log('[upload-progress-bot] UPLOAD', {
            mode,
            fileName,
            loaded,
            total,
          });
          return;
        }

        const percent = Math.round((loaded / total) * 100);

        if (percent === lastLoggedPercent) {
          return;
        }

        if (percent !== 100 && percent % 10 !== 0) {
          return;
        }

        lastLoggedPercent = percent;
        console.log('[upload-progress-bot] PROGRESS', {
          mode,
          fileName,
          loaded,
          total,
          percent,
        });
      },
    });

    await api.sendMessageToChat(
      chatId,
      'Видео загружено. Ниже отправлено само вложение.',
      { attachments: [video.toJson()] },
    );
  } catch (error) {
    if (controller.signal.aborted) {
      console.log('[upload-progress-bot] CANCEL');
      await api.sendMessageToChat(
        chatId,
        'Загрузка отменена. Можно запустить /upload повторно.',
      );
      return;
    }

    console.error('[upload-progress-bot] FAIL', error);
    await api.sendMessageToChat(
      chatId,
      'Загрузка завершилась ошибкой. Смотри детали в консоли.',
    );
  } finally {
    if (currentUploadController === controller) {
      currentUploadController = null;
    }
  }
}
