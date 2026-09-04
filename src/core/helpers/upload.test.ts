import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Api } from '../api';
import { type Client, createClient } from '../network/api';

const createApi = () => new Api({ call: vi.fn() } as unknown as Client);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Upload', () => {
  it('возвращает URL image без вызова upload endpoint', async () => {
    const api = createApi();
    const getUploadUrl = vi.spyOn(api.raw.uploads, 'getUploadUrl');

    const attachment = await api.uploadImage({
      url: 'https://cdn.example.test/image.png',
    });

    expect(attachment.toJson()).toEqual({
      type: 'image',
      payload: { url: 'https://cdn.example.test/image.png' },
    });

    expect(getUploadUrl).not.toHaveBeenCalled();
  });

  it('отправляет Buffer как multipart file и сообщает progress', async () => {
    const api = createApi();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, token: 'file-token' }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(api.raw.uploads, 'getUploadUrl').mockResolvedValue({
      url: 'https://upload.example.test/file',
    });
    const onProgress = vi.fn();

    const attachment = await api.uploadFile({
      source: Buffer.from('file body'),
      filename: 'report.txt',
      onProgress,
    });

    expect(attachment.toJson()).toEqual({
      type: 'file',
      payload: { token: 'file-token' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://upload.example.test/file',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'prepare',
      mode: 'multipart',
      fileName: 'report.txt',
      loaded: 0,
      total: 9,
    });
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        phase: 'upload',
        loaded: 0,
      }),
    );
    expect(onProgress).toHaveBeenLastCalledWith({
      phase: 'complete',
      mode: 'multipart',
      fileName: 'report.txt',
      loaded: 9,
      total: 9,
    });
  });

  it('использует custom fetch клиента для Bot API и upload endpoint', async () => {
    const customFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ url: 'https://upload.example.test/file' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'file-token' }), {
          status: 200,
        }),
      );
    const api = new Api(
      createClient('test-token', {
        baseUrl: 'https://api.example.test/',
        fetch: customFetch,
      }),
    );

    await api.uploadFile({
      source: Buffer.from('file body'),
      filename: 'report.txt',
    });

    expect(customFetch).toHaveBeenNthCalledWith(
      1,
      'https://api.example.test/uploads?type=file',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(customFetch).toHaveBeenNthCalledWith(
      2,
      'https://upload.example.test/file',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('использует uploadFetch только для передачи файла', async () => {
    const apiFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ url: 'https://upload.example.test/file' }),
          { status: 200 },
        ),
      );
    const uploadFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ token: 'file-token' }), {
        status: 200,
      }),
    );
    const api = new Api(
      createClient('test-token', {
        baseUrl: 'https://api.example.test/',
        fetch: apiFetch,
        uploadFetch,
      }),
    );

    await api.uploadFile({
      source: Buffer.from('file body'),
      filename: 'report.txt',
    });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      'https://api.example.test/uploads?type=file',
      expect.any(Object),
    );
    expect(uploadFetch).toHaveBeenCalledWith(
      'https://upload.example.test/file',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('использует uploadFetch для range-загрузки видео', async () => {
    const apiFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: 'https://upload.example.test/video',
          token: 'video-token',
        }),
        { status: 200 },
      ),
    );
    const uploadFetch = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response('', { status: 200 }));
    const api = new Api(
      createClient('test-token', {
        baseUrl: 'https://api.example.test/',
        fetch: apiFetch,
        uploadFetch,
      }),
    );
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'max-io-upload-'),
    );
    const sourcePath = path.join(directory, 'clip.mp4');
    await fs.writeFile(sourcePath, Buffer.alloc(128 * 1024, 'a'));

    await api.uploadVideo({ source: sourcePath });

    expect(apiFetch).toHaveBeenCalledWith(
      'https://api.example.test/uploads?type=video',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(uploadFetch).toHaveBeenCalledTimes(2);
    expect(uploadFetch).toHaveBeenNthCalledWith(
      1,
      'https://upload.example.test/video',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': 'bytes 0-65535/131072',
        }),
      }),
    );

    await fs.rm(directory, { recursive: true });
  });

  it('загружает video stream чанками через Content-Range', async () => {
    const api = createApi();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(api.raw.uploads, 'getUploadUrl').mockResolvedValue({
      url: 'https://upload.example.test/video',
      token: 'video-token',
    });
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'max-io-upload-'),
    );
    const sourcePath = path.join(directory, 'clip.mp4');
    await fs.writeFile(sourcePath, Buffer.alloc(128 * 1024, 'a'));
    const onProgress = vi.fn();

    const attachment = await api.uploadVideo({
      source: sourcePath,
      onProgress,
    });

    expect(attachment.toJson()).toEqual({
      type: 'video',
      payload: { token: 'video-token' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://upload.example.test/video',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': 'bytes 0-65535/131072',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://upload.example.test/video',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': 'bytes 65536-131071/131072',
        }),
      }),
    );
    expect(onProgress).toHaveBeenLastCalledWith({
      phase: 'complete',
      mode: 'range',
      fileName: 'clip.mp4',
      loaded: 131072,
      total: 131072,
    });

    await fs.rm(directory, { recursive: true });
  });

  it('не начинает запрос, если сигнал отменён заранее', async () => {
    const api = createApi();
    const controller = new AbortController();
    controller.abort();
    const getUploadUrl = vi.spyOn(api.raw.uploads, 'getUploadUrl');

    await expect(
      api.uploadFile({
        source: Buffer.from('file'),
        filename: 'report.txt',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(getUploadUrl).not.toHaveBeenCalled();
  });

  it('пробрасывает ошибку upload endpoint как MaxError', async () => {
    const api = createApi();
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ code: 'upload.failed', message: 'Failed' }),
            { status: 500 },
          ),
        ),
    );
    vi.spyOn(api.raw.uploads, 'getUploadUrl').mockResolvedValue({
      url: 'https://upload.example.test/file',
    });

    await expect(
      api.uploadFile({ source: Buffer.from('file'), filename: 'report.txt' }),
    ).rejects.toMatchObject({ status: 500, code: 'upload.failed' });
  });
});
