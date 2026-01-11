import * as fs from 'fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { type Api } from '../api';
import { MaxError, type UploadType } from '../network/api';

type FileSource = string | fs.ReadStream | Buffer;

type DefaultOptions = {
  timeout?: number;
};

type UploadFromSourceOptions = {
  source: FileSource;
};

type UploadFromUrlOptions = {
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

type UploadFile = FileStream | FileBuffer;

export type UploadImageOptions = UploadFromUrlOrSourceOptions & DefaultOptions;
export type UploadVideoOptions = UploadFromSourceOptions & DefaultOptions;
export type UploadFileOptions = UploadFromSourceOptions & DefaultOptions;
export type UploadAudioOptions = UploadFromSourceOptions & DefaultOptions;

const DEFAULT_UPLOAD_TIMEOUT = 20_000; // ms

type UploadRangeChunkParams = {
  uploadUrl: string;
  chunk: Buffer | string;
  startByte: number;
  endByte: number;
  fileSize: number;
  fileName: string;
};

const toRequestBody = (body: Buffer | string): RequestInit['body'] => {
  if (typeof body === 'string') return body;
  return new Uint8Array(body);
};

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

type UploadStreamParams = {
  file: FileStream;
  uploadUrl: string;
};

async function uploadRange(
  { uploadUrl, file }: UploadStreamParams,
  options: { signal?: AbortSignal } | undefined,
) {
  const size = file.contentLength;
  let startByte = 0;
  let endByte = 0;

  for await (const chunk of file.stream) {
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
      options,
    );

    startByte = endByte + 1;
  }
}

async function uploadMultipart<Res>(
  { uploadUrl, file }: UploadStreamParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Res> {
  const body = new FormData();
  body.append('data', {
    [Symbol.toStringTag]: 'File',
    name: file.fileName,
    stream: () => file.stream,
    size: file.contentLength,
  } as unknown as File);

  const result = await fetch(uploadUrl, {
    method: 'POST',
    body,
    signal,
  });

  const response = await result.json();

  return response as Res;
}

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

  private getUploadUrl = (type: UploadType) => {
    return this.api.raw.uploads.getUploadUrl({ type });
  };

  image = async (options: UploadImageOptions) => {
    if ('url' in options) {
      const { url, timeout } = options;
      const { token } = await this.getUploadUrl('image');
      await fetch(url, {
        signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT),
      });
      if (!token) throw new Error('Failed to upload image');
      return { token };
    }

    const { source, timeout } = options;
    const file = await this.getStreamFromSource(source);
    const { url } = await this.getUploadUrl('image');
    if ('buffer' in file) {
      await fetch(url, {
        method: 'POST',
        body: toRequestBody(file.buffer),
        signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT),
      });
      return { token: '' };
    }
    return uploadMultipart<{ token: string }>(
      {
        uploadUrl: url,
        file,
      },
      { signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT) },
    );
  };

  video = async (options: UploadVideoOptions) => {
    const { source, timeout } = options;
    const file = await this.getStreamFromSource(source);
    const { url } = await this.getUploadUrl('video');
    if ('buffer' in file) {
      await fetch(url, {
        method: 'POST',
        body: toRequestBody(file.buffer),
        signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT),
      });
      return { token: '' };
    }
    await uploadRange(
      {
        uploadUrl: url,
        file,
      },
      { signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT) },
    );
    return { token: '' };
  };

  audio = async (options: UploadAudioOptions) => {
    const { source, timeout } = options;
    const file = await this.getStreamFromSource(source);
    const { url } = await this.getUploadUrl('audio');
    if ('buffer' in file) {
      await fetch(url, {
        method: 'POST',
        body: toRequestBody(file.buffer),
        signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT),
      });
      return { token: '' };
    }
    await uploadRange(
      {
        uploadUrl: url,
        file,
      },
      { signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT) },
    );
    return { token: '' };
  };

  file = async (options: UploadFileOptions) => {
    const { source, timeout } = options;
    const file = await this.getStreamFromSource(source);
    const { url } = await this.getUploadUrl('file');
    if ('buffer' in file) {
      await fetch(url, {
        method: 'POST',
        body: toRequestBody(file.buffer),
        signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT),
      });
      return { token: '' };
    }
    await uploadRange(
      {
        uploadUrl: url,
        file,
      },
      { signal: AbortSignal.timeout(timeout ?? DEFAULT_UPLOAD_TIMEOUT) },
    );
    return { token: '' };
  };
}
