import { describe, expect, it, vi } from 'vitest';

import type { Api } from './api';
import { Composer } from './composer';
import { Context } from './context';
import type {
  BotInfo,
  BotStoppedUpdate,
  MessageCallbackUpdate,
  MessageCreatedUpdate,
  Update,
} from './network/api';

const botInfo: BotInfo = {
  user_id: 100,
  first_name: 'Test bot',
  name: 'Test bot',
  username: 'test_bot',
  is_bot: true,
};

const createMessageCreatedUpdate = (text: string): MessageCreatedUpdate => ({
  update_type: 'message_created',
  timestamp: 1_700_000_000_000,
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
      text,
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

const createMessageCallbackUpdate = (
  payload?: string,
): MessageCallbackUpdate => ({
  update_type: 'message_callback',
  timestamp: 1_700_000_000_000,
  callback: {
    timestamp: 1_700_000_000_000,
    callback_id: 'callback.test.1',
    payload,
    user: {
      user_id: 7,
      first_name: 'Test',
      name: 'Test',
      username: null,
      is_bot: false,
    },
  },
  message: null,
});

const createBotStoppedUpdate = (): BotStoppedUpdate => ({
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

const createContext = <U extends Update>(update: U) =>
  new Context(update, {} as Api, botInfo);

describe('Composer', () => {
  it('сохраняет порядок middleware до и после next()', async () => {
    const events: string[] = [];
    const composer = new Composer<Context>();

    composer.use(async (_ctx, next) => {
      events.push('first-before');
      await next();
      events.push('first-after');
    });
    composer.use(async (_ctx, next) => {
      events.push('second');
      await next();
    });

    await composer.middleware()(createContext(createBotStoppedUpdate()), () => {
      events.push('terminal');
      return Promise.resolve();
    });

    expect(events).toEqual([
      'first-before',
      'second',
      'terminal',
      'first-after',
    ]);
  });

  it('отклоняет повторный вызов next()', async () => {
    const composer = new Composer<Context>(
      async (_ctx, next) => {
        await next();
        await next();
      },
      async (_ctx, next) => next(),
    );

    await expect(
      composer.middleware()(createContext(createBotStoppedUpdate()), () =>
        Promise.resolve(),
      ),
    ).rejects.toThrow('`next` already called before!');
  });

  it('передаёт совпавшее событие в on и пропускает остальные', async () => {
    const handler = vi.fn(async () => undefined);
    const composer = new Composer<Context>();
    composer.on('bot_stopped', handler);

    await composer.middleware()(createContext(createBotStoppedUpdate()), () =>
      Promise.resolve(),
    );
    await composer.middleware()(
      createContext(createMessageCreatedUpdate('hello')),
      () => Promise.resolve(),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ updateType: 'bot_stopped' }),
      expect.any(Function),
    );
  });

  it('сужает событие через пользовательский guard', async () => {
    const stoppedUpdate = createBotStoppedUpdate();
    const handler = vi.fn(async (ctx: Context<BotStoppedUpdate>) => {
      expect(ctx.chatId).toBe(42);
    });
    const isBotStopped = (update: Update): update is BotStoppedUpdate =>
      update.update_type === 'bot_stopped';
    const composer = new Composer<Context>();
    composer.on(isBotStopped, handler);

    await composer.middleware()(createContext(stoppedUpdate), () =>
      Promise.resolve(),
    );

    expect(handler).toHaveBeenCalledOnce();
  });

  it('разбирает command, payload и аргументы с кавычками', async () => {
    const handler = vi.fn(async () => undefined);
    const composer = new Composer<Context>();
    composer.command('start', handler);

    await composer.middleware()(
      createContext(createMessageCreatedUpdate('/start "two words" plain')),
      () => Promise.resolve(),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'start',
        payload: '"two words" plain',
        args: ['two words', 'plain'],
      }),
      expect.any(Function),
    );
  });

  it('принимает упоминание своего бота в команде и игнорирует чужое', async () => {
    const handler = vi.fn(async () => undefined);
    const composer = new Composer<Context>();
    composer.command('start', handler);

    await composer.middleware()(
      createContext(createMessageCreatedUpdate('/start@test_bot hello')),
      () => Promise.resolve(),
    );
    await composer.middleware()(
      createContext(createMessageCreatedUpdate('/start@other_bot hello')),
      () => Promise.resolve(),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'hello' }),
      expect.any(Function),
    );
  });

  it('сохраняет RegExp match для hears', async () => {
    const handler = vi.fn(async () => undefined);
    const composer = new Composer<Context>();
    composer.hears(/^hello/i, handler);

    await composer.middleware()(
      createContext(createMessageCreatedUpdate('  Hello, Max!  ')),
      () => Promise.resolve(),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ match: expect.arrayContaining(['Hello']) }),
      expect.any(Function),
    );
  });

  it('маршрутизирует callback payload через action', async () => {
    const handler = vi.fn(async () => undefined);
    const composer = new Composer<Context>();
    composer.action('confirm', handler);

    await composer.middleware()(
      createContext(createMessageCallbackUpdate('confirm')),
      () => Promise.resolve(),
    );
    await composer.middleware()(
      createContext(createMessageCallbackUpdate('cancel')),
      () => Promise.resolve(),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        callback: expect.objectContaining({ payload: 'confirm' }),
        match: expect.arrayContaining(['confirm']),
      }),
      expect.any(Function),
    );
  });
});
