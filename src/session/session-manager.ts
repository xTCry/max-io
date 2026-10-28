import { Middleware, NextFn } from '@lib';
import { ExclusiveKeys } from '@lib/types';

import { MemoryStorage } from './storages';
import type {
  IContext,
  ISessionContext,
  ISessionManagerOptions,
  SessionConcurrency,
} from './types';

type SessionState = {
  value: ISessionContext;
  changed: boolean;
  writes: Promise<void>;
};

type SharedSession = {
  refs: number;
  state: Promise<SessionState>;
};

export class SessionManager<
  S extends NonNullable<C[P]>,
  C extends IContext & { [key in P]?: C[P] },
  P extends (ExclusiveKeys<C, IContext> & string) | 'session' = 'session',
> {
  protected storage: ISessionManagerOptions<S, C, P>['storage'];
  protected contextKey: ISessionManagerOptions<S, C, P>['contextKey'];
  protected getStorageKey: ISessionManagerOptions<S, C, P>['getStorageKey'];
  protected defaultSession: ISessionManagerOptions<S, C, P>['defaultSession'];
  protected concurrency: SessionConcurrency;
  private readonly queues = new Map<string, Promise<void>>();
  private readonly sharedSessions = new Map<string, SharedSession>();

  public constructor(options: Partial<ISessionManagerOptions<S, C, P>> = {}) {
    this.storage = options.storage || new MemoryStorage();

    this.contextKey = options.contextKey || ('session' as P);

    this.getStorageKey =
      options.getStorageKey ||
      ((ctx) =>
        !ctx.chatId || !ctx.user?.user_id
          ? undefined
          : `max-io:${ctx.chatId}:${ctx.user.user_id}`);

    this.defaultSession = options.defaultSession || ((_ctx: C): S => ({}) as S);
    this.concurrency = options.concurrency ?? 'serial';
  }

  /**
   * Returns the middleware for embedding
   */
  public get middleware(): Middleware<C> {
    const { contextKey, getStorageKey } = this;

    return async (ctx: C, next: NextFn) => {
      const storageKey = await getStorageKey(ctx);
      if (!storageKey) {
        await next();
        ctx[contextKey] = undefined as unknown as S;
        return;
      }

      if (this.concurrency === 'serial') {
        return this.runSerial(storageKey, () =>
          this.runSession(ctx, next, storageKey),
        );
      }

      let shared = this.sharedSessions.get(storageKey);
      if (!shared) {
        shared = { refs: 0, state: this.createState(ctx, storageKey) };
        this.sharedSessions.set(storageKey, shared);
      }
      shared.refs += 1;
      try {
        const state = await shared.state;
        await this.runSession(ctx, next, storageKey, state);
      } finally {
        shared.refs -= 1;
        if (shared.refs === 0) this.sharedSessions.delete(storageKey);
      }
    };
  }

  private async runSerial(
    key: string,
    run: () => Promise<void>,
  ): Promise<void> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(run);
    const settled = current.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(key, settled);
    try {
      await current;
    } finally {
      if (this.queues.get(key) === settled) this.queues.delete(key);
    }
  }

  private async createState(ctx: C, storageKey: string): Promise<SessionState> {
    const initialSession =
      (await this.storage.get(storageKey)) || this.defaultSession(ctx);
    const state: SessionState = {
      value: {} as ISessionContext,
      changed: false,
      writes: Promise.resolve(),
    };
    state.value = this.wrapSession(state, initialSession, storageKey);
    return state;
  }

  private wrapSession(
    state: SessionState,
    targetRaw: object,
    storageKey: string,
  ): ISessionContext {
    const target = { ...targetRaw } as ISessionContext;

    // Служебный метод не должен попасть в сериализуемое содержимое сессии.
    Object.defineProperty(target, '$forceUpdate', {
      value: () => this.saveState(state, storageKey, true),
      enumerable: false,
    });

    return new Proxy<ISessionContext>(target, {
      set: (target, prop: string, value): boolean => {
        state.changed = true;

        target[prop] = value;

        return true;
      },
      deleteProperty: (target, prop: string): boolean => {
        state.changed = true;

        delete target[prop];

        return true;
      },
    });
  }

  private async runSession(
    ctx: C,
    next: NextFn,
    key: string,
    existing?: SessionState,
  ): Promise<void> {
    const state = existing ?? (await this.createState(ctx, key));
    Object.defineProperty(ctx, this.contextKey, {
      get: (): ISessionContext => state.value,
      set: (value: S): void => {
        state.value = this.wrapSession(state, value, key);
        state.changed = true;
      },
    });
    try {
      await next();
    } catch (middlewareError) {
      try {
        await this.saveState(state, key, false);
      } catch (storageError) {
        // Обе причины нужны вызывающему коду: ошибка сохранения не должна скрывать ошибку middleware.
        throw new AggregateError(
          [middlewareError, storageError],
          'Middleware and session storage both failed',
        );
      }
      throw middlewareError;
    }
    await this.saveState(state, key, false);
  }

  private saveState(
    state: SessionState,
    key: string,
    force: boolean,
  ): Promise<boolean> {
    // Снимки сохраняются по очереди, чтобы медленный storage не перезаписал новые данные.
    const write = state.writes
      .catch(() => undefined)
      .then(async () => {
        if (!force && !state.changed) {
          await this.storage.touch(key);
          return true;
        }
        state.changed = false;
        const snapshot = { ...state.value };
        try {
          return await (Object.keys(snapshot).length > 0
            ? this.storage.set(key, snapshot)
            : this.storage.delete(key));
        } catch (error) {
          state.changed = true;
          throw error;
        }
      });
    state.writes = write.then(
      () => undefined,
      () => undefined,
    );
    return write;
  }
}
