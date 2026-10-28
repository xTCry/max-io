import { describe, expect, it, vi } from 'vitest';

import { Composer } from '../core/composer';
import { Context } from '../core/context';
import type { MiddlewareFn, NextFn } from '../core/middleware';
import type { BotStoppedUpdate } from '../core/network/api';
import { SessionManager } from './session-manager';
import { MemoryStorage } from './storages';
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
  it('по умолчанию последовательно обрабатывает события одной сессии', async () => {
    const storage = new MemoryStorage();
    const manager = new SessionManager<Session, SessionContext>({ storage });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = vi.fn();
    const first = runMiddleware(manager, createContext(), async () => {
      entered();
      await gate;
    });
    const second = runMiddleware(manager, createContext(), async () => {
      entered();
    });
    await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const beforeRelease = entered.mock.calls.length;
    release();
    await Promise.all([first, second]);
    expect(beforeRelease).toBe(1);
    expect(entered).toHaveBeenCalledTimes(2);
  });

  it('в режиме shared параллельные события изменяют общий объект сессии', async () => {
    const storage = new MemoryStorage();
    const manager = new SessionManager<Session, SessionContext>({
      storage,
      concurrency: 'shared',
    });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = vi.fn();
    const firstContext = createContext();
    const secondContext = createContext();
    const run = (ctx: SessionContext) =>
      runMiddleware(manager, ctx, async () => {
        entered();
        await gate;
        ctx.session.visits = (ctx.session.visits ?? 0) + 1;
      });
    const first = run(firstContext);
    const second = run(secondContext);
    await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(2));
    release();
    await Promise.all([first, second]);
    expect(await storage.get('max-io:42:7')).toEqual({ visits: 2 });
  });

  it('в последовательном режиме не блокирует разные ключи сессии', async () => {
    const manager = new SessionManager<Session, SessionContext>();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = vi.fn();
    const first = runMiddleware(manager, createContext(42), async () => {
      entered();
      await gate;
    });
    const second = runMiddleware(manager, createContext(43), async () => {
      entered();
    });
    await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(2));
    release();
    await Promise.all([first, second]);
  });

  it('продолжает очередь сессии после ошибки обработчика', async () => {
    const storage = new MemoryStorage();
    const manager = new SessionManager<Session, SessionContext>({ storage });
    const firstContext = createContext();
    const secondContext = createContext();
    const first = runMiddleware(manager, firstContext, async () => {
      firstContext.session.visits = 1;
      throw new Error('handler failed');
    });
    const rejected = expect(first).rejects.toThrow('handler failed');
    const second = runMiddleware(manager, secondContext, async () => {
      secondContext.session.visits = 2;
    });
    await rejected;
    await second;
    expect(await storage.get('max-io:42:7')).toEqual({ visits: 2 });
  });

  it('в последовательном режиме сохраняет оба изменения после await', async () => {
    const storage = new MemoryStorage();
    const manager = new SessionManager<Session, SessionContext>({ storage });
    const increment = (ctx: SessionContext) =>
      runMiddleware(manager, ctx, async () => {
        const visits = ctx.session.visits ?? 0;
        await Promise.resolve();
        ctx.session.visits = visits + 1;
      });

    await Promise.all([increment(createContext()), increment(createContext())]);
    expect(await storage.get('max-io:42:7')).toEqual({ visits: 2 });
  });

  it('в shared режиме переиспользует чтение и видит замену общего объекта', async () => {
    const storage = createStorage();
    const manager = new SessionManager<Session, SessionContext>({
      storage,
      concurrency: 'shared',
    });
    const firstContext = createContext();
    const secondContext = createContext();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = vi.fn();
    const first = runMiddleware(manager, firstContext, async () => {
      entered();
      await gate;
      expect(firstContext.session.visits).toBe(7);
    });
    const second = runMiddleware(manager, secondContext, async () => {
      secondContext.session = { visits: 7 } as Session;
      entered();
      await gate;
    });
    await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(2));
    release();
    await Promise.all([first, second]);
    expect(storage.get).toHaveBeenCalledOnce();
    expect(storage.set).toHaveBeenCalledWith('max-io:42:7', { visits: 7 });
  });

  it('в shared режиме ждёт предыдущее сохранение и записывает свежий снимок', async () => {
    const storage = createStorage();
    let releaseWrite: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    vi.mocked(storage.set).mockImplementationOnce(async () => {
      await gate;
      return true;
    });
    const manager = new SessionManager<Session, SessionContext>({
      storage,
      concurrency: 'shared',
    });
    const firstContext = createContext();
    const secondContext = createContext();
    let releaseSecond: () => void = () => undefined;
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const entered = vi.fn();
    const secondChanged = vi.fn();
    const first = runMiddleware(manager, firstContext, async () => {
      entered();
      await secondGate;
      firstContext.session.visits = 1;
    });
    const second = runMiddleware(manager, secondContext, async () => {
      entered();
      await secondGate;
      await vi.waitFor(() => expect(storage.set).toHaveBeenCalledOnce());
      secondContext.session.visits = 2;
      secondChanged();
    });
    await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(2));
    releaseSecond();
    await vi.waitFor(() => expect(secondChanged).toHaveBeenCalledOnce());
    releaseWrite();
    await Promise.all([first, second]);
    expect(storage.set).toHaveBeenNthCalledWith(1, 'max-io:42:7', {
      visits: 1,
    });
    expect(storage.set).toHaveBeenNthCalledWith(2, 'max-io:42:7', {
      visits: 2,
    });
  });

  it('сохраняет изменения после отложенного middleware с вызовом next без await', async () => {
    const storage = createStorage();
    const manager = new SessionManager<Session, SessionContext>({ storage });
    const context = createContext();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = vi.fn();
    const composer = new Composer<SessionContext>();
    composer.use(manager.middleware);
    composer.use((_ctx, next) => {
      void next();
    });
    composer.use(async (ctx) => {
      started();
      await gate;
      ctx.session.visits = 2;
    });

    const completed = vi.fn();
    const running = Promise.resolve(
      composer.middleware()(context, async () => undefined),
    ).then(completed);
    await vi.waitFor(() => expect(started).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 0));
    const completedBeforeRelease = completed.mock.calls.length > 0;
    release();
    await running;

    expect(completedBeforeRelease).toBe(false);
    expect(storage.set).toHaveBeenCalledWith('max-io:42:7', { visits: 2 });
    expect(storage.touch).not.toHaveBeenCalled();
  });

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
