import * as fs from 'fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { type Api } from '../api';
import { MaxError, type UploadType } from '../network/api';

type FileSource = string | fs.ReadStream | Buffer;

/** Этап загрузки файла. */
export type UploadProgressPhase = 'prepare' | 'upload' | 'complete';

/** Режим загрузки файла на upload URL. */
export type UploadProgressMode = 'range' | 'multipart';

/** Снимок прогресса загрузки файла. */
export type UploadProgress = {
  /** Этап загрузки: подготовка upload URL, передача файла или завершение. */
  phase: UploadProgressPhase;
  /** Режим загрузки: `range` для Content-Range или `multipart` для FormData. */
  mode: UploadProgressMode;
  /** Имя файла, которое передаётся upload endpoint. */
  fileName: string;
  /** Загружено байт на текущем этапе. */
  loaded: number;
  /** Общий размер файла в байтах, если он известен. */
  total?: number;
};

/** Обработчик событий прогресса upload. */
export type UploadProgressHandler = (progress: UploadProgress) => void;

/** Общие параметры upload-запросов. */
export type UploadRequestOptions = {
  /** Таймаут загрузки файла в миллисекундах. По умолчанию `20000`. */
  timeout?: number;
  /** Сигнал отмены получения upload URL и передачи файла на upload endpoint. */
  signal?: AbortSignal;
  /** Callback для отслеживания этапов и прогресса загрузки. */
  onProgress?: UploadProgressHandler;
};

type DefaultOptions = UploadRequestOptions;

type UploadFromSourceOptions = {
  /** Источник файла: путь, `ReadStream` или `Buffer`. */
  source: FileSource;
};

type UploadFromUrlOptions = {
  /** URL изображения, которое нужно прикрепить без загрузки через upload API. */
  url: string;
};

type UploadFromUrlOrSourceOptions =
  | UploadFromSourceOptions
  | UploadFromUrlOptions;

type BaseFile = {
  fileName: string;
};

type FileStream = BaseFile & {
  stream: fs.ReadStream;
  contentLength: number;
};

type FileBuffer = BaseFile & {
  buffer: Buffer;
};

type FileBlob = BaseFile & { blob: Blob };

type UploadFile = FileStream | FileBuffer | FileBlob;

type UploadProgressContext = {
  mode: UploadProgressMode;
  fileName: string;
  total?: number;
  onProgress?: UploadProgressHandler;
};

/**
 * Параметры загрузки изображения.
 *
 * @remarks Изображение можно передать как `url` без upload API или как локальный `source`.
 * При upload сервер возвращает `photos`, которые используются в `ImageAttachment`.
 */
export type UploadImageOptions = UploadFromUrlOrSourceOptions & DefaultOptions;

/**
 * Параметры загрузки видео.
 *
 * @remarks Для видео Bot API возвращает token уже в ответе `POST /uploads`,
 * а upload endpoint после передачи файла отвечает служебным результатом обработки.
 */
export type UploadVideoOptions = UploadFromSourceOptions & DefaultOptions;

/**
 * Параметры загрузки файла.
 *
 * @remarks Для `file` token приходит из ответа upload endpoint после передачи файла.
 */
export type UploadFileOptions = UploadFromSourceOptions & DefaultOptions;

/**
 * Параметры загрузки аудио.
 *
 * @remarks Для аудио Bot API возвращает token уже в ответе `POST /uploads`,
 * а upload endpoint после передачи файла отвечает служебным результатом обработки.
 */
export type UploadAudioOptions = UploadFromSourceOptions & DefaultOptions;

const DEFAULT_UPLOAD_TIMEOUT = 20_000; // ms

const toRequestBody = (body: Buffer | string): RequestInit['body'] => {
  if (typeof body === 'string') return body;
  return new Uint8Array(body);
};

const clampLoaded = (loaded: number, total?: number) => {
  if (!Number.isFinite(loaded) || loaded <= 0) {
    return 0;
  }

  if (total === undefined || !Number.isFinite(total) || total <= 0) {
    return loaded;
  }

  return Math.min(loaded, total);
};

const emitProgress = (
  context: UploadProgressContext,
  phase: UploadProgressPhase,
  loaded: number,
) => {
  context.onProgress?.({
    phase,
    mode: context.mode,
    fileName: context.fileName,
    loaded: clampLoaded(loaded, context.total),
    total: context.total,
  });
};

const combineSignals = (
  signals: Array<AbortSignal | undefined>,
): AbortSignal | undefined => {
  const validSignals = signals.filter(
    (signal): signal is AbortSignal => signal !== undefined,
  );

  if (validSignals.length === 0) {
    return undefined;
  }

  if (validSignals.length === 1) {
    return validSignals[0];
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(validSignals);
  }

  const controller = new AbortController();

  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener(
      'abort',
      () => {
        controller.abort(signal.reason);
      },
      { once: true },
    );
  }

  return controller.signal;
};

const getAbortError = (reason?: unknown) => {
  if (reason instanceof Error) {
    return reason;
  }

  const error = new Error('Upload aborted');
  error.name = 'AbortError';

  return error;
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) {
    return;
  }

  throw getAbortError(signal.reason);
};

const getUploadMode = (
  file: UploadFile,
  token?: string,
): UploadProgressMode => {
  if ('stream' in file && token) {
    return 'range';
  }

  return 'multipart';
};

const getUploadTotal = (file: UploadFile) => {
  if ('stream' in file) {
    return file.contentLength;
  }

  if ('blob' in file) {
    return file.blob.size;
  }

  return file.buffer.length;
};

/**
 * Параметры загрузки чатка через Content-Range
 */
type UploadRangeChunkParams = {
  /**
   * URL для загрузки файла
   */
  uploadUrl: string;
  /**
   * Чанк-данных для загрузки
   */
  chunk: Buffer | string;
  /**
   * Начальный байт в общем потоке файла
   */
  startByte: number;
  /**
   * Конечный байт в общем потоке файла
   */
  endByte: number;
  /**
   * Общий размер файла
   */
  fileSize: number;
  /**
   * Имя файла для загрузки
   */
  fileName: string;
};

/**
 * Загрузить чанк данных через Content-Range запрос
 */
async function uploadRangeChunk(
  {
    uploadUrl,
    chunk,
    startByte,
    endByte,
    fileSize,
    fileName,
  }: UploadRangeChunkParams,
  { signal }: { signal?: AbortSignal } = {},
) {
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    body: toRequestBody(chunk),
    headers: {
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
      'Content-Type': 'application/x-binary; charset=x-user-defined',
      'X-File-Name': fileName,
      'X-Uploading-Mode': 'parallel',
      Connection: 'keep-alive',
    },
    signal,
  });

  if (uploadRes.status >= 400) {
    const error = await uploadRes.json();
    throw new MaxError(uploadRes.status, error);
  }

  return uploadRes.text();
}

/**
 * Параметры загрузки данных через Content-Range или Multipart запрос
 */
type UploadStreamParams = {
  /**
   * Файл для загрузки
   */
  file: FileStream;
  /**
   * URL для загрузки файла
   */
  uploadUrl: string;
  /**
   * Контекст прогресса
   */
  progress: UploadProgressContext;
};

type UploadMultipartParams = {
  /**
   * Файл для multipart-загрузки
   */
  file: FileStream | FileBlob;
  /**
   * URL для загрузки файла
   */
  uploadUrl: string;
  /**
   * Контекст прогресса
   */
  progress: UploadProgressContext;
};

/**
 * Загрузить файл через Content-Range запрос
 */
async function uploadRange(
  { uploadUrl, file, progress }: UploadStreamParams,
  { signal }: { signal?: AbortSignal } = {},
) {
  const size = file.contentLength;
  let startByte = 0;
  let endByte = 0;

  emitProgress(progress, 'upload', 0);

  for await (const chunk of file.stream) {
    throwIfAborted(signal);

    endByte = startByte + chunk.length - 1;
    await uploadRangeChunk(
      {
        uploadUrl,
        startByte,
        endByte,
        chunk,
        fileName: file.fileName,
        fileSize: size,
      },
      { signal },
    );

    startByte = endByte + 1;
    emitProgress(progress, 'upload', startByte);
  }

  emitProgress(progress, 'complete', size);
}

/**
 * Загрузить файл через Multipart запрос
 */
async function uploadMultipart<Res>(
  { uploadUrl, file, progress }: UploadMultipartParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Res> {
  const body = new FormData();

  if ('blob' in file) {
    body.append('data', file.blob, file.fileName);
  } else {
    body.append('data', {
      [Symbol.toStringTag]: 'File',
      name: file.fileName,
      stream: () => file.stream,
      size: file.contentLength,
    } as unknown as File);
  }

  emitProgress(progress, 'upload', 0);

  const result = await fetch(uploadUrl, {
    method: 'POST',
    body,
    signal,
  });

  const response = (await result.json()) as Res;
  emitProgress(progress, 'complete', progress.total ?? 0);

  return response;
}

const openAsBlob =
  'openAsBlob' in fs && typeof fs.openAsBlob === 'function'
    ? fs.openAsBlob.bind(fs)
    : undefined;

export class Upload {
  constructor(private readonly api: Api) {}

  private getStreamFromSource = async (
    source: FileSource,
  ): Promise<UploadFile> => {
    if (typeof source === 'string') {
      const stat = await fs.promises.stat(source);
      const fileName = path.basename(source);

      if (!stat.isFile()) {
        throw new Error(`Failed to upload ${fileName}. Not a file`);
      }

      const stream = fs.createReadStream(source);

      return {
        stream,
        fileName,
        contentLength: stat.size,
      };
    }

    if (Buffer.isBuffer(source)) {
      return {
        buffer: source,
        fileName: randomUUID(),
      };
    }

    const stat = await fs.promises.stat(source.path);
    const fileName =
      typeof source.path === 'string'
        ? path.basename(source.path)
        : randomUUID();

    if (!stat.isFile()) {
      throw new Error(`Failed to upload ${fileName}. Not a file`);
    }

    return {
      stream: source,
      fileName,
      contentLength: stat.size,
    };
  };

  private getBlobFromSource = async (
    source: FileSource,
  ): Promise<FileBlob | null> => {
    if (!openAsBlob) {
      return null;
    }

    if (typeof source === 'string') {
      const stat = await fs.promises.stat(source);
      const fileName = path.basename(source);

      if (!stat.isFile()) {
        throw new Error(`Failed to upload ${fileName}. Not a file`);
      }

      return {
        blob: await openAsBlob(source),
        fileName,
      };
    }

    if (Buffer.isBuffer(source) || typeof source.path !== 'string') {
      return null;
    }

    const fileName = path.basename(source.path);
    const stat = await fs.promises.stat(source.path);

    if (!stat.isFile()) {
      throw new Error(`Failed to upload ${fileName}. Not a file`);
    }

    return {
      blob: await openAsBlob(source.path),
      fileName,
    };
  };

  private getBufferFromSource = async (
    source: FileSource,
  ): Promise<FileBuffer> => {
    if (typeof source === 'string') {
      const stat = await fs.promises.stat(source);
      const fileName = path.basename(source);

      if (!stat.isFile()) {
        throw new Error(`Failed to upload ${fileName}. Not a file`);
      }

      return {
        buffer: await fs.promises.readFile(source),
        fileName,
      };
    }

    if (Buffer.isBuffer(source)) {
      return {
        buffer: source,
        fileName: randomUUID(),
      };
    }

    if (typeof source.path === 'string') {
      const fileName = path.basename(source.path);
      const stat = await fs.promises.stat(source.path);

      if (!stat.isFile()) {
        throw new Error(`Failed to upload ${fileName}. Not a file`);
      }

      return {
        buffer: await fs.promises.readFile(source.path),
        fileName,
      };
    }

    const chunks: Buffer[] = [];

    for await (const chunk of source) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return {
      buffer: Buffer.concat(chunks),
      fileName: randomUUID(),
    };
  };

  private upload = async <Res>(
    type: UploadType,
    file: UploadFile,
    options?: DefaultOptions,
  ) => {
    throwIfAborted(options?.signal);

    const res = await this.api.raw.uploads.getUploadUrl({ type });
    const { url: uploadUrl, token } = res;
    const progress: UploadProgressContext = {
      mode: getUploadMode(file, token),
      fileName: file.fileName,
      total: getUploadTotal(file),
      onProgress: options?.onProgress,
    };
    const timeoutController = new AbortController();
    const signal = combineSignals([options?.signal, timeoutController.signal]);

    emitProgress(progress, 'prepare', 0);

    const uploadInterval = setTimeout(() => {
      timeoutController.abort(new Error('Upload timeout exceeded'));
    }, options?.timeout ?? DEFAULT_UPLOAD_TIMEOUT);

    try {
      if ('stream' in file) {
        return await this.uploadFromStream<Res>({
          file,
          uploadUrl,
          signal,
          token,
          progress,
        });
      }

      if ('blob' in file) {
        return await this.uploadFromBlob<Res>({
          file,
          uploadUrl,
          signal,
          progress,
        });
      }

      return await this.uploadFromBuffer<Res>({
        file,
        uploadUrl,
        signal,
        progress,
      });
    } finally {
      clearTimeout(uploadInterval);
    }
  };

  private uploadFromStream = async <Res>({
    file,
    uploadUrl,
    token,
    signal,
    progress,
  }: {
    file: FileStream;
    uploadUrl: string;
    signal?: AbortSignal;
    token?: string;
    progress: UploadProgressContext;
  }): Promise<Res> => {
    if (token) {
      await uploadRange({ file, uploadUrl, progress }, { signal });

      return {
        token,
        file,
        uploadUrl,
      } as Res;
    }

    return uploadMultipart<Res>({ file, uploadUrl, progress }, { signal });
  };

  private uploadFromBlob = async <Res>({
    file,
    uploadUrl,
    signal,
    progress,
  }: {
    file: FileBlob;
    uploadUrl: string;
    signal?: AbortSignal;
    progress: UploadProgressContext;
  }): Promise<Res> => {
    return uploadMultipart<Res>({ file, uploadUrl, progress }, { signal });
  };

  private uploadFromBuffer = async <Res>({
    file,
    uploadUrl,
    signal,
    progress,
  }: {
    file: FileBuffer;
    uploadUrl: string;
    signal?: AbortSignal;
    progress: UploadProgressContext;
  }): Promise<Res> => {
    return uploadMultipart<Res>(
      {
        uploadUrl,
        progress,
        file: {
          fileName: file.fileName,
          blob: new Blob([new Uint8Array(file.buffer)]),
        },
      },
      { signal },
    );
  };

  image = async ({
    timeout,
    signal,
    onProgress,
    ...source
  }: UploadImageOptions) => {
    if ('url' in source) {
      return { url: source.url };
    }

    // Для файлового image source используем нативный Blob, чтобы multipart
    // был корректным без полной загрузки файла в JS-память.
    const fileBlob = await this.getBlobFromSource(source.source);
    const uploadFile =
      fileBlob ?? (await this.getBufferFromSource(source.source));

    return this.upload<{
      photos: { [key: string]: { token: string } };
    }>('image', uploadFile, { timeout, signal, onProgress });
  };

  video = async ({ source, ...options }: UploadVideoOptions) => {
    const fileBlob = await this.getStreamFromSource(source);

    return this.upload<{
      id: number;
      token: string;
    }>('video', fileBlob, options);
  };

  file = async ({ source, ...options }: UploadFileOptions) => {
    const fileBlob = await this.getStreamFromSource(source);

    return this.upload<{
      id: number;
      token: string;
    }>('file', fileBlob, options);
  };

  audio = async ({ source, ...options }: UploadAudioOptions) => {
    const fileBlob = await this.getStreamFromSource(source);

    return this.upload<{
      id: number;
      token: string;
    }>('audio', fileBlob, options);
  };
}
