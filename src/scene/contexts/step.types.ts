import type { IStepContext, StepSceneHandler } from '../scenes/step.types';
import { IContext } from '../types';

export interface IStepContextOptions<
  C extends IContext,
  P extends string = 'session',
> {
  context: IStepContext<C, P>;
  steps: StepSceneHandler<C, P>[];
}

export interface IStepContextGoOptions {
  /**
   * Logging into a handler without executing it
   */
  silent?: boolean;
}
