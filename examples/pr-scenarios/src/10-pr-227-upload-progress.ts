import 'dotenv/config';

import { Bot, MaxError, type Context } from 'max-io';
import type { AttachmentRequest } from 'max-io/types';

import { createReadStream, readFileSync } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import path from 'node:path';

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
  { name: 'videoStream', description: 'Upload video from ReadStream' },
  { name: 'videoBuffer', description: 'Upload video from buffer' },
  { name: 'videoHandleStream', description: 'Upload video from FD stream' },
  { name: 'audioPath', description: 'Upload audio from file path' },
  { name: 'audioStream', description: 'Upload audio from stream' },
  { name: 'audioBuffer', description: 'Upload audio from buffer' },
  { name: 'audioHandleStream', description: 'Upload audio from FD stream' },
  { name: 'filePath', description: 'Upload file from file path' },
  { name: 'fileStream', description: 'Upload file from ReadStream' },
  { name: 'fileBuffer', description: 'Upload file from buffer' },
  { name: 'fileHandleStream', description: 'Upload file from FD stream' },
  { name: 'imagePath', description: 'Upload image via multipart' },
  { name: 'imageStream', description: 'Upload image from ReadStream' },
  { name: 'imageBuffer', description: 'Upload image from buffer' },
  { name: 'imageHandleStream', description: 'Upload image from FD stream' },
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

bot.command('videoBuffer', async (ctx) => {
  return runUploadScenario(ctx, 'videoBuffer', uploadVideoPath, (session) => {
    return ctx.api.uploadVideo({
      source: readFileSync(uploadVideoPath),
      filename: path.basename(uploadVideoPath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('videoStream', async (ctx) => {
  return runUploadScenario(ctx, 'videoStream', uploadVideoPath, (session) => {
    return ctx.api.uploadVideo({
      source: createReadStream(uploadVideoPath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('videoHandleStream', async (ctx) => {
  return runFileHandleStreamScenario(
    ctx,
    'videoHandleStream',
    uploadVideoPath,
    (source, session) => {
      return ctx.api.uploadVideo({
        source,
        filename: path.basename(uploadVideoPath),
        timeout: uploadTimeout,
        signal: session.signal,
        onProgress: session.onProgress,
      });
    },
  );
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

bot.command('audioPath', async (ctx) => {
  return runUploadScenario(ctx, 'audioPath', uploadAudioPath, (session) => {
    return ctx.api.uploadAudio({
      source: uploadAudioPath,
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('audioBuffer', async (ctx) => {
  return runUploadScenario(ctx, 'audioBuffer', uploadAudioPath, (session) => {
    return ctx.api.uploadAudio({
      source: readFileSync(uploadAudioPath),
      filename: path.basename(uploadAudioPath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('audioHandleStream', async (ctx) => {
  return runFileHandleStreamScenario(
    ctx,
    'audioHandleStream',
    uploadAudioPath,
    (source, session) => {
      return ctx.api.uploadAudio({
        source,
        filename: path.basename(uploadAudioPath),
        timeout: uploadTimeout,
        signal: session.signal,
        onProgress: session.onProgress,
      });
    },
  );
});

bot.command('fileBuffer', async (ctx) => {
  return runUploadScenario(ctx, 'fileBuffer', uploadFilePath, (session) => {
    return ctx.api.uploadFile({
      source: readFileSync(uploadFilePath),
      filename: path.basename(uploadFilePath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('filePath', async (ctx) => {
  return runUploadScenario(ctx, 'filePath', uploadFilePath, (session) => {
    return ctx.api.uploadFile({
      source: uploadFilePath,
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('fileStream', async (ctx) => {
  return runUploadScenario(ctx, 'fileStream', uploadFilePath, (session) => {
    return ctx.api.uploadFile({
      source: createReadStream(uploadFilePath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('fileHandleStream', async (ctx) => {
  return runFileHandleStreamScenario(
    ctx,
    'fileHandleStream',
    uploadFilePath,
    (source, session) => {
      return ctx.api.uploadFile({
        source,
        filename: path.basename(uploadFilePath),
        timeout: uploadTimeout,
        signal: session.signal,
        onProgress: session.onProgress,
      });
    },
  );
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

bot.command('imageStream', async (ctx) => {
  return runUploadScenario(ctx, 'imageStream', uploadImagePath, (session) => {
    return ctx.api.uploadImage({
      source: createReadStream(uploadImagePath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('imageBuffer', async (ctx) => {
  return runUploadScenario(ctx, 'imageBuffer', uploadImagePath, (session) => {
    return ctx.api.uploadImage({
      source: readFileSync(uploadImagePath),
      filename: path.basename(uploadImagePath),
      timeout: uploadTimeout,
      signal: session.signal,
      onProgress: session.onProgress,
    });
  });
});

bot.command('imageHandleStream', async (ctx) => {
  return runFileHandleStreamScenario(
    ctx,
    'imageHandleStream',
    uploadImagePath,
    (source, session) => {
      return ctx.api.uploadImage({
        source,
        filename: path.basename(uploadImagePath),
        timeout: uploadTimeout,
        signal: session.signal,
        onProgress: session.onProgress,
      });
    },
  );
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
    console.log(`[pr-227:${scenarioName}] UPLOAD_RESPONSE`);
    console.dir(formatAttachmentForLog(attachment), { depth: 10 });

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
    console.log(`[pr-227:${scenarioName}] SENT_ATTACHMENTS`);
    console.dir(sanitizeForLog(sentMessage.body.attachments), { depth: 10 });

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

/**
 * Проверяет ReadStream без `stream.path`, созданный через FileHandle.
 * Такой поток нельзя повторно открыть для Content-Range, поэтому библиотека
 * должна безопасно перейти на multipart с буферизацией.
 */
async function runFileHandleStreamScenario(
  ctx: Context,
  scenarioName: string,
  sourcePath: string,
  upload: (
    source: ReturnType<Awaited<ReturnType<typeof open>>['createReadStream']>,
    session: ReturnType<typeof createUploadDebugSession>,
  ) => Promise<UploadAttachment>,
) {
  const fileHandle = await open(sourcePath, 'r');

  try {
    return await runUploadScenario(ctx, scenarioName, sourcePath, (session) => {
      return upload(fileHandle.createReadStream(), session);
    });
  } finally {
    await fileHandle.close();
  }
}

function getScenarioErrorMessage(error: unknown, wasCanceled: boolean) {
  if (wasCanceled) {
    return 'Загрузка прервана по Esc';
  }

  if (error instanceof MaxError) {
    return `${error.status} | ${error.code} | ${error.description}`;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'Загрузка была прервана';
    }

    return error.message;
  }

  return 'Unknown upload error';
}

/**
 * Формирует безопасную для терминала сводку upload-вложения.
 *
 * Токены и URL нельзя выводить полностью: они могут давать доступ к загрузке
 * или вложению и должны оставаться только в защищённом окружении.
 */
function formatAttachmentForLog(attachment: UploadAttachment) {
  return sanitizeForLog(attachment.toJson());
}

type SafeLogValue =
  | string
  | number
  | boolean
  | null
  | SafeLogValue[]
  | { [key: string]: SafeLogValue };

function sanitizeForLog(value: unknown): SafeLogValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        isSensitiveField(key) && typeof entry === 'string'
          ? maskSecret(entry)
          : sanitizeForLog(entry),
      ]),
    );
  }

  return String(value);
}

function isSensitiveField(key: string) {
  return key.toLowerCase() === 'token' || key.toLowerCase() === 'url';
}

function maskSecret(value: string) {
  if (value.length <= 10) return '***';

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
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
