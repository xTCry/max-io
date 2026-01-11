import type { Context as MaxContext } from '@lib';

import type { CacheRepository } from './cache-repository';
import type { SceneContext } from './contexts';
import type { StepSceneContext } from './contexts/step';
import type { IScene } from './scenes/scene';

export type AnyState = Record<string, unknown>;

export type IContext = MaxContext;

export type SceneSessionState<S extends AnyState = AnyState> = {
  current: string;
  firstTime: boolean;
  stepId?: number;
  state?: S;
};

export interface ISessionContainer<S extends AnyState = AnyState> {
  __scene?: SceneSessionState<S>;
}

export type SceneStateOf<C, P extends string> =
  C extends Record<P, infer SESS>
    ? SESS extends ISessionContainer<infer S>
      ? S
      : AnyState
    : AnyState;

export type WithScene<
  C extends IContext = IContext,
  P extends string = 'session',
> = C & {
  scene: SceneContext<C, P>;
};

export type WithStepScene<
  C extends IContext = IContext,
  P extends string = 'session',
> = WithScene<C, P> & {
  scene: {
    /**
     * Stepping scene control context
     */
    step: StepSceneContext<C, P>;
  };
};

export type SceneRepository<C extends IContext = IContext> = CacheRepository<
  string,
  IScene<C>
>;

export interface ISceneManagerOptions<
  C extends IContext = IContext,
  P extends string = 'session',
> {
  /**
   * Scenes on the interface IScene
   */
  scenes?: IScene<C>[];
  /**
   * Key for session in context
   */
  sessionKey?: P;
}
