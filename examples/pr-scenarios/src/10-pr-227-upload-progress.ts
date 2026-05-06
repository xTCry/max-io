import 'dotenv/config';

import { Bot, type Context } from 'max-io';
import type { AttachmentRequest } from 'max-io/types';

import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';

import {
  token,
  uploadAudioPath,
  uploadFilePath,
  uploadImagePath,
  uploadTimeout,
  uploadVideoPath,
} from './env';
import { createUploadDebugSession } from './fetch-upload-debug';
import {
  registerScenarioFallback,
  startScenarioBot,
  syncScenarioCommands,
} from './runtime';

const commands = [
  { name: 'videoPath', description: 'Upload video from file path' },
  { name: 'audioStream', description: 'Upload audio from stream' },
  { name: 'fileBuffer', description: 'Upload file from buffer' },
  { name: 'imagePath', description: 'Upload image via multipart' },
];

type UploadAttachment = {
  toJson(): AttachmentRequest;
};

type FileInfo = {
  label: string;
  size: number;
};

const bot = new Bot(token);

registerScenarioFallback(bot, {
  scenarioName: '10-pr-227-upload-progress',
  commands,
  fallbackLines: [
    'В консоли рисуется прогрессбар загрузки. Нажми Esc, чтобы прервать активный upload.',
  ],
});

bot.command('videoPath', async (ctx) => {
  return runUploadScenario(ctx, 'videoPath', uploadVideoPath, (session) => {
    return ctx.api.uploadVideo({
      source: uploadVideoPath,
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('audioStream', async (ctx) => {
  return runUploadScenario(ctx, 'audioStream', uploadAudioPath, (session) => {
    return ctx.api.uploadAudio({
      source: createReadStream(uploadAudioPath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('fileBuffer', async (ctx) => {
  return runUploadScenario(ctx, 'fileBuffer', uploadFilePath, (session) => {
    return ctx.api.uploadFile({
      source: readFileSync(uploadFilePath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('imagePath', async (ctx) => {
  return runUploadScenario(ctx, 'imagePath', uploadImagePath, (session) => {
    return ctx.api.uploadImage({
      source: uploadImagePath,
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

startScenarioBot(bot, {
  scenarioName: '10-pr-227-upload-progress',
  commands,
  beforeStart: () => syncScenarioCommands(bot, commands),
  fallbackLines: [
    'В консоли рисуется прогрессбар загрузки. Нажми Esc, чтобы прервать активный upload.',
  ],
});

async function runUploadScenario(
  ctx: Context,
  scenarioName: string,
  sourcePath: string,
  upload: (
    session: ReturnType<typeof createUploadDebugSession>,
  ) => Promise<UploadAttachment>,
) {
  const fileInfo = await describeFile(sourcePath);
  const startedAt = Date.now();

  console.log(
    [
      `[pr-227:${scenarioName}] START`,
      `file=${fileInfo.label}`,
      `timeout=${uploadTimeout}ms`,
    ].join(' | '),
  );

  await ctx.reply(
    [
      `Запускаю сценарий ${scenarioName}.`,
      `Источник: ${fileInfo.label}`,
      'В консоли запустится прогрессбар загрузки.',
      'Нажми Esc в терминале, если нужно прервать активный upload.',
    ].join('\n'),
  );

  const uploadSession = createUploadDebugSession({
    scenarioName: `pr-227:${scenarioName}`,
    filePath: sourcePath,
    totalBytes: fileInfo.size,
  });
  let uploadCompleted = false;

  try {
    const attachment = await upload(uploadSession);
    const uploadedAt = Date.now();
    const uploadDuration = uploadedAt - startedAt;

    uploadSession.complete();
    uploadCompleted = true;

    console.log(
      `[pr-227:${scenarioName}] UPLOADED | duration=${uploadDuration}ms`,
    );

    const sentMessage = await ctx.reply(
      [
        `Сценарий ${scenarioName} завершён.`,
        `Файл: ${fileInfo.label}`,
        `Загрузка: ${uploadDuration}ms`,
        'Ниже отправлено само вложение этим сообщением.',
      ].join('\n'),
      {
        attachments: [attachment.toJson()],
      },
    );

    const duration = Date.now() - startedAt;

    console.log(
      [
        `[pr-227:${scenarioName}] SENT`,
        `messageId=${sentMessage.body.mid}`,
        `duration=${duration}ms`,
      ].join(' | '),
    );

    return sentMessage;
  } catch (error) {
    const duration = Date.now() - startedAt;
    const wasCanceled = uploadSession.wasCanceled();
    const message = getScenarioErrorMessage(error, wasCanceled);

    if (!uploadCompleted && !wasCanceled) {
      uploadSession.fail(message);
    }

    console.error(
      `[pr-227:${scenarioName}] ${wasCanceled ? 'CANCEL' : 'FAIL'} | duration=${duration}ms | ${message}`,
    );

    return ctx.reply(
      [
        `Сценарий ${scenarioName} завершился ошибкой.`,
        `Файл: ${fileInfo.label}`,
        `Длительность: ${duration}ms`,
        `Ошибка: ${message}`,
      ].join('\n'),
    );
  }
}

function getScenarioErrorMessage(error: unknown, wasCanceled: boolean) {
  if (wasCanceled) {
    return 'Загрузка прервана по Esc';
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'Загрузка была прервана';
    }

    return error.message;
  }

  return 'Unknown upload error';
}

async function describeFile(filePath: string): Promise<FileInfo> {
  const info = await stat(filePath);

  return {
    label: `${filePath} (${formatBytes(info.size)})`,
    size: info.size,
  };
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
