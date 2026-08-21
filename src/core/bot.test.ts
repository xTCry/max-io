import * as http from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Bot } from './bot';
import type {
  BotInfo,
  BotStoppedUpdate,
  MessageCreatedUpdate,
} from './network/api';

const createUpdate = (): BotStoppedUpdate => ({
  update_type: 'bot_stopped',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createMessageCreatedUpdate = (): MessageCreatedUpdate => ({
  update_type: 'message_created',
  timestamp: 1_700_000_000_000,
  user_locale: 'ru',
  message: {
    recipient: {
      chat_id: 42,
      chat_type: 'dialog',
      user_id: 100,
    },
    timestamp: 1_700_000_000_000,
    body: {
      mid: 'mid.test.1',
      seq: 1,
      text: '/start hello',
      attachments: null,
    },
    sender: {
      user_id: 7,
      first_name: 'Test',
      name: 'Test',
      username: null,
      is_bot: false,
    },
    constructor: null,
  },
});

const createBotInfo = (): BotInfo => ({
  user_id: 100,
  first_name: 'Test bot',
  name: 'Test bot',
  username: 'test_bot',
  is_bot: true,
});

const sendRequest = async ({
  listener,
  method = 'POST',
  path = '/',
  headers = {},
  bodyChunks = [],
}: {
  listener: http.RequestListener;
  method?: string;
  path?: string;
  headers?: http.OutgoingHttpHeaders;
  bodyChunks?: string[];
}) => {
  const server = http.createServer(listener);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server address');
    }

    return await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const request = http.request(
          {
            host: '127.0.0.1',
            port: address.port,
            method,
            path,
            headers,
          },
          (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => {
              resolve({
                status: response.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              });
            });
          },
        );

        request.once('error', reject);
        bodyChunks.forEach((chunk) => request.write(chunk));
        request.end();
      },
    );
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Bot.webhookCallback', () => {
  it('передаёт корректный update в middleware', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);
    const update = createUpdate();

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates'),
      path: '/updates',
      headers: { 'content-type': 'application/json' },
      bodyChunks: [JSON.stringify(update)],
    });

    expect(response).toEqual({ status: 200, body: '{"ok":true}' });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ update }),
      expect.any(Function),
    );
  });

  it('отклоняет запрос с неверным секретом до обработки body', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates', { secret: 'expected-secret' }),
      path: '/updates',
      headers: { 'x-max-bot-api-secret': 'wrong-secret' },
      bodyChunks: [JSON.stringify(createUpdate())],
    });

    expect(response).toEqual({
      status: 401,
      body: '{"ok":false,"error":"invalid_secret"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('отклоняет неверный method, path и content-type до middleware', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);
    const listener = bot.webhookCallback('/updates');

    const methodResponse = await sendRequest({
      listener,
      method: 'GET',
      path: '/updates',
    });
    const pathResponse = await sendRequest({
      listener,
      path: '/other-path',
    });
    const contentTypeResponse = await sendRequest({
      listener,
      path: '/updates',
      headers: { 'content-type': 'text/plain' },
      bodyChunks: [JSON.stringify(createUpdate())],
    });

    expect(methodResponse).toEqual({
      status: 404,
      body: '{"ok":false,"error":"not_found"}',
    });
    expect(pathResponse).toEqual({
      status: 404,
      body: '{"ok":false,"error":"not_found"}',
    });
    expect(contentTypeResponse).toEqual({
      status: 415,
      body: '{"ok":false,"error":"unsupported_media_type"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('отклоняет пустой webhook body без запуска middleware', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates'),
      path: '/updates',
      headers: { 'content-type': 'application/json' },
    });

    expect(response).toEqual({
      status: 400,
      body: '{"ok":false,"error":"invalid_payload"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('отклоняет body больше лимита по Content-Length', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates', { maxBodySize: 10 }),
      path: '/updates',
      headers: { 'content-length': '11', 'content-type': 'application/json' },
      bodyChunks: ['01234567890'],
    });

    expect(response).toEqual({
      status: 413,
      body: '{"ok":false,"error":"payload_too_large"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('отклоняет превышение лимита в chunked body', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates', { maxBodySize: 10 }),
      path: '/updates',
      headers: { 'content-type': 'application/json' },
      bodyChunks: ['012345', '678901'],
    });

    expect(response).toEqual({
      status: 413,
      body: '{"ok":false,"error":"payload_too_large"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('безопасно обрабатывает невалидный JSON', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates'),
      path: '/updates',
      headers: { 'content-type': 'application/json' },
      bodyChunks: ['{invalid'],
    });

    expect(response).toEqual({
      status: 400,
      body: '{"ok":false,"error":"invalid_payload"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('отклоняет JSON без обязательных полей update', async () => {
    const bot = new Bot('test-token');
    const handler = vi.fn(async () => undefined);
    bot.use(handler);

    const response = await sendRequest({
      listener: bot.webhookCallback('/updates'),
      path: '/updates',
      headers: { 'content-type': 'application/json' },
      bodyChunks: [JSON.stringify({ update_type: 'bot_stopped' })],
    });

    expect(response).toEqual({
      status: 400,
      body: '{"ok":false,"error":"invalid_payload"}',
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Bot.start polling', () => {
  it('доставляет ответ polling в command middleware и корректно останавливается', async () => {
    const update = createMessageCreatedUpdate();
    const bot = new Bot('test-token', {
      apiBaseUrl: 'https://api.example.test/',
    });
    const command = vi.fn(async () => {
      bot.stop();
    });
    bot.command('start', command);

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createBotInfo()), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ subscriptions: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ updates: [update], marker: 36586680 }), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await bot.start();

    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({
        update,
        command: 'start',
        payload: 'hello',
        args: ['hello'],
      }),
      expect.any(Function),
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.test/me',
      'https://api.example.test/subscriptions',
      'https://api.example.test/updates?types=',
    ]);
    expect(bot.polling.marker).toBe(36586680);
  });

  it('передает ошибку middleware в пользовательский обработчик', async () => {
    const bot = new Bot('test-token');
    const middlewareError = new Error('middleware failed');
    const errorHandler = vi.fn(async () => undefined);
    bot.use(async () => Promise.reject(middlewareError));
    bot.catch(errorHandler);

    await expect(bot.handleUpdate(createUpdate())).resolves.toBeUndefined();

    expect(errorHandler).toHaveBeenCalledWith(
      middlewareError,
      expect.objectContaining({ update: createUpdate() }),
    );
  });
});
