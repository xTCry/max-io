import { Middleware, NextFn } from '@lib';
import { ExclusiveKeys } from '@lib/types';

import { MemoryStorage } from './storages';
import type {
  IContext,
  ISessionContext,
  ISessionManagerOptions,
} from './types';

export class SessionManager<
  S extends NonNullable<C[P]>,
  C extends IContext & { [key in P]?: C[P] },
  P extends (ExclusiveKeys<C, IContext> & string) | 'session' = 'session',
> {
  protected storage: ISessionManagerOptions<S, C, P>['storage'];
  protected contextKey: ISessionManagerOptions<S, C, P>['contextKey'];
  protected getStorageKey: ISessionManagerOptions<S, C, P>['getStorageKey'];
  protected defaultSession: ISessionManagerOptions<S, C, P>['defaultSession'];

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
  }

  /**
   * Returns the middleware for embedding
   */
  public get middleware(): Middleware<C> {
    const { storage, contextKey, getStorageKey } = this;

    return async (ctx: C, next: NextFn) => {
      const storageKey = await getStorageKey(ctx);
      if (!storageKey) {
        await next();
        ctx[contextKey] = undefined as unknown as S;
        return;
      }

      let changed = false;
      const wrapSession = (targetRaw: object): ISessionContext =>
        new Proxy<ISessionContext>(
          { ...targetRaw, $forceUpdate },
          {
            set: (target, prop: string, value): boolean => {
              changed = true;

              target[prop] = value;

              return true;
            },
            deleteProperty: (target, prop: string): boolean => {
              changed = true;

              delete target[prop];

              return true;
            },
          },
        );

      const $forceUpdate = (): Promise<boolean> => {
        if (Object.keys(session).length > 1) {
          changed = false;
          return storage.set(storageKey, session);
        }

        return storage.delete(storageKey);
      };

      const initialSession =
        (await storage.get(storageKey)) || this.defaultSession(ctx);
      let session = wrapSession(initialSession);

      Object.defineProperty(ctx, contextKey, {
        get: (): ISessionContext => session,
        set: (newSession: S): void => {
          session = wrapSession(newSession);
          changed = true;
        },
      });

      await next();

      if (changed) {
        await $forceUpdate();
      } else {
        await storage.touch(storageKey);
      }
    };
  }
}
