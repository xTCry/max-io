import type { Context } from '@lib';
import { MaybePromise } from '@core/helpers/types';

import type { ISessionStorage } from './storages';

export type SessionForceUpdate = () => Promise<boolean>;

export interface IContext extends Context {}

export interface ISessionContext {
  $forceUpdate(): Promise<boolean>;
}

export interface ISessionManagerOptions<
  S,
  C extends IContext,
  P extends string,
> {
  /**
   * Storage based on ISessionStorage interface
   */
  storage: ISessionStorage;

  /**
   * Key for session in context
   */
  contextKey: P;

  /**
   * Returns the key for session storage
   */
  getStorageKey(ctx: C): MaybePromise<string | undefined>;

  defaultSession(ctx: C): S;
}
