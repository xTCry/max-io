import { afterEach, describe, expect, it, vi } from 'vitest';

import { Api } from '../../api';
import { createClient } from './client';
import { parseResponse } from './response';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createClient', () => {
  it('сериализует path, query и JSON body, сохраняя AbortSignal', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    const client = createClient('test-token', {
      baseUrl: 'https://api.example.test/v1/',
    });

    await client.call({
      method: 'chats/{chat_id}',
      options: {
        method: 'POST',
        path: { chat_id: 42 },
        query: { active: true, omitted: undefined },
        body: { text: 'Привет' },
        signal,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/chats/42?active=true',
      expect.objectContaining({
        method: 'POST',
        body: '{"text":"Привет"}',
        signal,
        headers: {
          Authorization: 'test-token',
          'content-type': 'application/json',
        },
      }),
    );
  });

  it('возвращает ошибку пустого токена без сетевого запроса', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const client = createClient('');

    await expect(
      client.call({ method: 'updates', options: {} }),
    ).resolves.toEqual({
      status: 401,
      data: {
        code: 'verify.token',
        message: 'Empty access_token',
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('использует custom fetch для запросов Bot API', async () => {
    const customFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    const client = createClient('test-token', {
      baseUrl: 'https://api.example.test/v1/',
      fetch: customFetch,
    });

    await client.call({ method: 'me', options: {} });

    expect(customFetch).toHaveBeenCalledWith(
      'https://api.example.test/v1/me',
      expect.objectContaining({
        headers: { Authorization: 'test-token' },
        method: 'GET',
      }),
    );
  });

  it('использует uploadFetch для передачи файлов вместо fetch Bot API', () => {
    const apiFetch = vi.fn<typeof fetch>();
    const uploadFetch = vi.fn<typeof fetch>();
    const client = createClient('test-token', {
      fetch: apiFetch,
      uploadFetch,
    });

    expect(client.uploadFetch).toBe(uploadFetch);
  });

  it('не читает body ответа при HTTP 401', async () => {
    const text = vi.fn(async () => 'secret response body');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      status: 401,
      text,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const client = createClient('test-token');

    await expect(
      client.call({ method: 'updates', options: {} }),
    ).resolves.toEqual({
      status: 401,
      data: {
        code: 'verify.token',
        message: 'Invalid access_token',
      },
    });
    expect(text).not.toHaveBeenCalled();
  });
});

describe('parseResponse', () => {
  it('возвращает исходный текст, если proxy вернул не-JSON ответ', async () => {
    await expect(
      parseResponse(
        new Response('<html>Bad gateway</html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    ).resolves.toEqual({
      data: '<html>Bad gateway</html>',
      text: '<html>Bad gateway</html>',
      isJson: false,
    });
  });

  it('превращает не-JSON HTTP-ошибку API в диагностируемую MaxError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('<html>Bad gateway</html>', { status: 502 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const api = new Api(createClient('test-token'));

    await expect(api.getUpdates()).rejects.toMatchObject({
      status: 502,
      code: 'http.response.invalid',
      description: 'Unexpected HTTP response (502)',
      responseText: '<html>Bad gateway</html>',
    });
  });
});
