import type {
  IContext,
  ISessionContainer,
  SceneSessionState,
  SceneStateOf,
} from '../types';
import {
  type ISceneContextEnterOptions,
  type ISceneContextLeaveOptions,
  type ISceneContextOptions,
  LastAction,
} from './scene.types';

export class SceneContext<C extends IContext, P extends string = 'session'> {
  /**
   * Lazy session for submodules
   * ```ts
   * ctx.scene.session.moduleFlag = true;
   * ```
   */
  public session!: SceneSessionState<SceneStateOf<C, P>>;

  /**
   * Base namespace for user input
   *
   * ```ts
   * ctx.scene.state.firstName = myInputText;
   * ```
   */
  public state!: SceneStateOf<C, P>;

  /**
   * Is the scene canceled, used in leaveHandler()
   *
   * ```ts
   * ctx.scene.leave({ canceled: true });
   * ```
   */
  public canceled = false;

  public lastAction: LastAction = LastAction.NONE;

  /**
   * Controlled behavior leave
   */
  public leaving = false;

  private ctx: C & Record<P, ISessionContainer<SceneStateOf<C, P> /* any */>>;
  private repository: ISceneContextOptions<C, P>['repository'];
  private sessionKey: P;

  public constructor(options: ISceneContextOptions<C, P>) {
    this.ctx = options.ctx;
    this.repository = options.repository;
    this.sessionKey = options.sessionKey;

    this.updateSession();
  }

  /**
   * Returns current scene
   */
  public get current() {
    return this.repository.get(this.session.current);
  }

  /**
   * Enter to scene
   *
   * ```ts
   * ctx.scene.enter('signup');
   * ctx.scene.enter('signup', {
   *   silent: true,
   *   state: {
   *     firstName: 'Super Developer',
   *   }
   * });
   * ```
   */
  public async enter(
    slug: string,
    options: ISceneContextEnterOptions<SceneStateOf<C, P>> = {},
  ): Promise<void> {
    const scene = this.repository.strictGet(slug);

    const isCurrent = this.current?.slug === scene.slug;
    if (!isCurrent) {
      if (!this.leaving) {
        await this.leave({
          silent: options.silent,
        });
      }

      if (this.leaving) {
        this.leaving = false;

        this.reset();
      }
    }

    this.lastAction = LastAction.ENTER;
    this.session.current = scene.slug;
    Object.assign(this.state, options.state || {});

    if (options.silent) {
      return;
    }

    await scene.enterHandler(this.ctx);
  }

  /**
   * Reenter to current scene
   *
   * ```ts
   * ctx.scene.reenter();
   * ```
   */
  public async reenter(): Promise<void> {
    const { current } = this;
    if (!current) {
      throw new Error('There is no active scene to enter');
    }

    await this.enter(current.slug);
  }

  /**
   * Leave from current scene
   *
   * ```ts
   * ctx.scene.leave();
   * ctx.scene.leave({
   *   silent: true,
   *   canceled: true,
   * });
   * ```
   */
  public async leave(options: ISceneContextLeaveOptions = {}): Promise<void> {
    const { current } = this;
    if (!current) {
      return;
    }

    this.leaving = true;
    this.lastAction = LastAction.LEAVE;

    if (!options.silent) {
      this.canceled = options.canceled ?? false;
      await current.leaveHandler(this.ctx);
    }

    if (this.leaving) {
      this.reset();
    }

    this.leaving = false;
    this.canceled = false;
  }

  /**
   * Reset state/session
   */
  public reset(): void {
    delete this.ctx[this.sessionKey].__scene;

    this.updateSession();
  }

  /**
   * Updates session and state is lazy
   */
  private updateSession(): void {
    const container = this.ctx[this.sessionKey];
    this.session = new Proxy(
      container.__scene || ({} as SceneSessionState<SceneStateOf<C, P>>),
      {
        set: (target, prop: string, value): boolean => {
          target[prop] = value;
          container.__scene = target;
          return true;
        },
      },
    );

    this.state = new Proxy(this.session.state || ({} as SceneStateOf<C, P>), {
      set: (target, prop: string, value): boolean => {
        (target[prop] as Record<string, unknown>) = value;
        this.session.state = target;
        return true;
      },
    });
  }
}
