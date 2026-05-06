import 'dotenv/config';

import { Bot, type Context } from 'max-io';
import { stat } from 'node:fs/promises';

import { token, uploadTimeout, uploadVideoPath } from './env';
import { createUploadDebugSession } from './fetch-upload-debug';
import {
  registerScenarioFallback,
  startScenarioBot,
  syncScenarioCommands,
} from './runtime';

const scenarioName = '30-video-attachment-details';

const commands = [
  {
    name: 'videoDetails',
    description: 'Upload video or check details by token',
  },
];

type FileInfo = {
  label: string;
  size: number;
};

const bot = new Bot(token);

registerScenarioFallback(bot, {
  scenarioName,
  commands,
  fallbackLines: [
    'Команда без аргументов загрузит demo-видео и запросит details по полученному token.',
    'Можно передать готовый token: /videoDetails <token>.',
  ],
});

bot.command('videoDetails', async (ctx) => {
  const tokenArg = ctx.args?.[0];

  if (tokenArg) {
    return sendVideoDetails(ctx, tokenArg);
  }

  void uploadAndSendVideoDetails(ctx);

  return ctx.reply(
    [
      'Начинаю загрузку demo-видео.',
      `Источник: ${uploadVideoPath}`,
      'После загрузки запрошу details по video token и пришлю краткий результат сюда.',
      'Прогресс загрузки отображается в терминале. Нажми Esc, чтобы прервать upload.',
    ].join('\n'),
  );
});

startScenarioBot(bot, {
  scenarioName,
  commands,
  beforeStart: () => syncScenarioCommands(bot, commands),
  fallbackLines: [
    'Команда без аргументов загрузит demo-видео и запросит details по полученному token.',
    'Можно передать готовый token: /videoDetails <token>.',
  ],
});

async function uploadAndSendVideoDetails(ctx: Context) {
  const fileInfo = await describeFile(uploadVideoPath);
  const startedAt = Date.now();

  console.log(
    [
      `[video-details] UPLOAD_START`,
      `file=${fileInfo.label}`,
      `timeout=${uploadTimeout}ms`,
    ].join(' | '),
  );

  const uploadSession = createUploadDebugSession({
    scenarioName: 'video-details',
    filePath: uploadVideoPath,
    totalBytes: fileInfo.size,
  });

  try {
    const attachment = await ctx.api.uploadVideo({
      source: uploadVideoPath,
      timeout: uploadTimeout,
      signal: uploadSession.signal,
      onProgress: uploadSession.onProgress,
    });

    uploadSession.complete();

    if (!attachment.token) {
      throw new Error('Video token was not returned after upload');
    }

    const duration = Date.now() - startedAt;
    console.log(
      `[video-details] UPLOADED | duration=${duration}ms | token=${maskToken(attachment.token)}`,
    );

    await ctx.reply(
      [
        'Видео загружено.',
        `Файл: ${fileInfo.label}`,
        `Загрузка: ${duration}ms`,
        `Token: ${maskToken(attachment.token)}`,
        'Запрашиваю details по token...',
      ].join('\n'),
    );

    return sendVideoDetails(ctx, attachment.token);
  } catch (error) {
    const message = getErrorMessage(error, uploadSession.wasCanceled());

    if (!uploadSession.wasCanceled()) {
      uploadSession.fail(message);
    }

    console.error(`[video-details] FAIL | ${message}`);

    return ctx.reply(
      ['Сценарий завершился ошибкой.', `Ошибка: ${message}`].join('\n'),
    );
  } finally {
    uploadSession.dispose();
  }
}

async function sendVideoDetails(ctx: Context, videoToken: string) {
  console.log(`[video-details] DETAILS_START | token=${maskToken(videoToken)}`);

  try {
    const details = await ctx.api.getVideoAttachmentDetails(videoToken);

    console.log('[video-details] DETAILS_RESPONSE');
    console.dir(details, { depth: 10 });

    return ctx.reply(formatDetails(details));
  } catch (error) {
    const message = getErrorMessage(error, false);

    console.error(`[video-details] DETAILS_FAIL | ${message}`);

    return ctx.reply(
      [
        'Не удалось получить details по video token.',
        `Ошибка: ${message}`,
      ].join('\n'),
    );
  }
}

function formatDetails(
  details: Awaited<ReturnType<Context['api']['getVideoAttachmentDetails']>>,
) {
  const urls = Object.entries(details.urls)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  return [
    'Video attachment details:',
    `Token: ${maskToken(details.token)}`,
    `Размер: ${formatOptionalNumber(details.width)}x${formatOptionalNumber(details.height)}`,
    `Длительность: ${formatOptionalNumber(details.duration)}`,
    `Thumbnail: ${details.thumbnail?.url ? 'есть' : 'нет'}`,
    `Urls: ${urls.length > 0 ? urls.join(', ') : 'нет'}`,
    'Полный ответ напечатан в терминале.',
  ].join('\n');
}

async function describeFile(filePath: string): Promise<FileInfo> {
  const info = await stat(filePath);

  return {
    label: `${filePath} (${formatBytes(info.size)})`,
    size: info.size,
  };
}

function getErrorMessage(error: unknown, wasCanceled: boolean) {
  if (wasCanceled) return 'Загрузка прервана по Esc';

  if (error instanceof Error) return error.message;

  return 'Unknown error';
}

function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : 'n/a';
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function maskToken(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
