import type { IContext, ISessionContainer, SceneRepository } from '../types';

export interface ISceneContextOptions<
  C extends IContext,
  P extends string = 'session',
> {
  ctx: C & Record<P, ISessionContainer<any>>;
  sessionKey: P;
  repository: SceneRepository<C>;
}

export interface ISceneContextEnterOptions<S extends Record<string, unknown>> {
  /**
   * Logging into a handler without executing it
   */
  silent?: boolean;
  /**
   * The standard state for the scene
   */
  state?: S;
}

export interface ISceneContextLeaveOptions {
  /**
   * Logging into a handler without executing it
   */
  silent?: boolean;
  /**
   * Canceled scene
   */
  canceled?: boolean;
}

export enum LastAction {
  NONE = 'none',
  ENTER = 'enter',
  LEAVE = 'leave',
}
