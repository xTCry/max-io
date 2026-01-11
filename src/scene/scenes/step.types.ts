import type { IContext, WithStepScene } from '../types';

export type IStepContext<
  C extends IContext,
  P extends string = 'session',
> = WithStepScene<C, P>;

export type StepSceneHandler<
  C extends IContext,
  P extends string = 'session',
> = (ctx: IStepContext<C, P>) => unknown;

export interface IStepSceneOptions<
  C extends IContext,
  P extends string = 'session',
> {
  steps: StepSceneHandler<C, P>[];
  enterHandler?: StepSceneHandler<C, P>;
  leaveHandler?: StepSceneHandler<C, P>;
}
