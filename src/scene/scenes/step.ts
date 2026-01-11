import { StepSceneContext } from '../contexts';
import { LastAction } from '../contexts/scene.types';
import type { IContext } from '../types';
import type { IScene } from './scene';
import type {
  IStepContext,
  IStepSceneOptions,
  StepSceneHandler,
} from './step.types';

export class StepScene<C extends IContext> implements IScene<C> {
  private steps: StepSceneHandler<C>[];
  private onEnterHandler: NonNullable<IStepSceneOptions<C>['enterHandler']>;
  private onLeaveHandler: NonNullable<IStepSceneOptions<C>['leaveHandler']>;

  public constructor(
    public readonly slug: string,
    rawOptions: IStepSceneOptions<C> | StepSceneHandler<C>[],
  ) {
    const options = Array.isArray(rawOptions)
      ? { steps: rawOptions }
      : rawOptions;

    this.steps = options.steps;
    this.onEnterHandler = options.enterHandler || ((): void => {});
    this.onLeaveHandler = options.leaveHandler || ((): void => {});
  }

  public async enterHandler(ctx: C): Promise<void> {
    const stepCtx = ctx as IStepContext<C>;
    stepCtx.scene.step = new StepSceneContext<C>({
      context: stepCtx,
      steps: this.steps,
    });

    await this.onEnterHandler(stepCtx);

    if (stepCtx.scene.lastAction !== LastAction.LEAVE) {
      await stepCtx.scene.step.reenter();
    }
  }

  public leaveHandler(ctx: C): Promise<unknown> {
    const stepCtx = ctx as IStepContext<C>;
    return Promise.resolve(this.onLeaveHandler(stepCtx));
  }
}
