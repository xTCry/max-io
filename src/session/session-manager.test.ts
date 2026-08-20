import { describe, expect, it, vi } from 'vitest';

import { Context } from '../core/context';
import type { MiddlewareFn, NextFn } from '../core/middleware';
import type { BotStoppedUpdate } from '../core/network/api';
import { SessionManager } from './session-manager';
import type { ISessionStorage } from './storages';
import type { ISessionContext } from './types';

type Session = ISessionContext & {
  visits?: number;
};

type SessionContext = Context & {
  session: Session;
};

const createUpdate = (chatId = 42): BotStoppedUpdate => ({
  update_type: 'bot_stopped',
  timestamp: 1_700_000_000_000,
  chat_id: chatId,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createContext = (chatId = 42) =>
  new Context(createUpdate(chatId), {} as never) as unknown as SessionContext;

const createStorage = (): ISessionStorage => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => true),
  delete: vi.fn(async () => true),
  touch: vi.fn(async () => undefined),
});

const runMiddleware = <C extends Context>(
  manager: { middleware: unknown },
  context: C,
  next: NextFn,
) => (manager.middleware as MiddlewareFn<C>)(context, next);

describe('SessionManager', () => {
  it('загружает сессию, сохраняет изменённые поля и не сохраняет служебный метод', async () => {
    const storage = createStorage();
    vi.mocked(storage.get).mockResolvedValue({ visits: 1 });
    const manager = new SessionManager<Session, SessionContext>({ storage });
    const context = createContext();

    await runMiddleware(manager, context, async () => {
      context.session.visits = 2;
    });

    expect(storage.get).toHaveBeenCalledWith('max-io:42:7');
    expect(storage.set).toHaveBeenCalledWith('max-io:42:7', { visits: 2 });
    expect(storage.touch).not.toHaveBeenCalled();
  });

  it('продлевает TTL, если сессия не менялась', async () => {
    const storage = createStorage();
    vi.mocked(storage.get).mockResolvedValue({ visits: 1 });
    const manager = new SessionManager<Session, SessionContext>({ storage });

    await runMiddleware(manager, createContext(), async () => undefined);

    expect(storage.touch).toHaveBeenCalledWith('max-io:42:7');
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('удаляет сессию, когда удалено её последнее пользовательское поле', async () => {
    const storage = createStorage();
    vi.mocked(storage.get).mockResolvedValue({ visits: 1 });
    const manager = new SessionManager<Session, SessionContext>({ storage });
    const context = createContext();

    await runMiddleware(manager, context, async () => {
      delete context.session.visits;
    });

    expect(storage.delete).toHaveBeenCalledWith('max-io:42:7');
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('forceUpdate сохраняет изменения до завершения middleware', async () => {
    const storage = createStorage();
    const manager = new SessionManager<Session, SessionContext>({ storage });
    const context = createContext();

    await runMiddleware(manager, context, async () => {
      context.session.visits = 1;
      await context.session.$forceUpdate();
      context.session.visits = 2;
    });

    expect(storage.set).toHaveBeenNthCalledWith(1, 'max-io:42:7', {
      visits: 1,
    });
    expect(storage.set).toHaveBeenNthCalledWith(2, 'max-io:42:7', {
      visits: 2,
    });
  });

  it('подставляет defaultSession и поддерживает своё имя поля контекста', async () => {
    type CustomContext = Context & { data: Session };
    const storage = createStorage();
    const manager = new SessionManager<Session, CustomContext, 'data'>({
      storage,
      contextKey: 'data',
      defaultSession: () => ({ visits: 10 }) as Session,
    });
    const context = createContext() as unknown as CustomContext;

    await runMiddleware(manager, context, async () => {
      expect(context.data.visits).toBe(10);
      context.data.visits = 11;
    });

    expect(storage.set).toHaveBeenCalledWith('max-io:42:7', { visits: 11 });
  });

  it('не создаёт сессию без storage key и очищает поле после next', async () => {
    const storage = createStorage();
    const manager = new SessionManager<Session, SessionContext>({
      storage,
      getStorageKey: () => undefined,
    });
    const context = createContext();

    await runMiddleware(manager, context, async () => {
      expect(context.session).toBeUndefined();
    });

    expect(context.session).toBeUndefined();
    expect(storage.get).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.touch).not.toHaveBeenCalled();
  });
});
