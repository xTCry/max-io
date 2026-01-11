import { IContext } from '../types';

export interface IScene<C extends IContext> {
  /**
   * The unique name of the scene
   */
  slug: string;

  /**
   * Enter handler for the scene
   */
  enterHandler(ctx: C): unknown;

  /**
   * Leave handler for the scene
   */
  leaveHandler(ctx: C): unknown;
}
