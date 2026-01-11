import { Middleware } from '@lib';

import { CacheRepository } from './cache-repository';
import { SceneContext } from './contexts';
import type { IScene } from './scenes/scene';
import type {
  IContext,
  ISceneManagerOptions,
  ISessionContainer,
  SceneRepository,
  WithScene,
} from './types';

export class SceneManager<
  C extends IContext & Record<P, ISessionContainer<any>>,
  P extends string = 'session',
> {
  private repository: SceneRepository<C> = new CacheRepository();
  private sessionKey: P;

  public constructor({
    scenes,
    sessionKey = 'session' as P,
  }: ISceneManagerOptions<C, P> = {}) {
    this.sessionKey = sessionKey;
    if (scenes) {
      this.addScenes(scenes);
    }
  }

  /**
   * Checks for has a scene
   */
  public hasScene(slug: string): boolean {
    return this.repository.has(slug);
  }

  /**
   * Adds scenes to the repository
   */
  public addScenes(scenes: IScene<C>[]): this {
    for (const scene of scenes) {
      this.repository.set(scene.slug, scene);
    }
    return this;
  }

  /**
   * Returns the middleware for embedding
   */
  public get middleware(): Middleware<WithScene<C, P>> {
    return (ctx, next): Promise<void> => {
      ctx.scene = new SceneContext<C, P>({
        ctx,
        sessionKey: this.sessionKey,
        repository: this.repository,
      });
      return next();
    };
  }

  /**
   * Returns the middleware for intercept
   */
  public get middlewareIntercept(): Middleware<WithScene<C, P>> {
    return (ctx, next): Promise<void> => {
      if (!ctx.scene.current) {
        return next();
      }
      return ctx.scene.reenter();
    };
  }
}
