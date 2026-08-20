import { describe, expect, it, vi } from 'vitest';

import { Context } from '../core/context';
import type { MiddlewareFn } from '../core/middleware';
import type { BotStoppedUpdate } from '../core/network/api';
import { SceneManager } from './scene-manager';
import { StepScene } from './scenes/step';
import type { ISessionContainer, WithStepScene } from './types';

type Session = ISessionContainer<{ name?: string }>;
type SceneTestContext = Context & { session: Session };
type InstalledSceneContext = SceneTestContext & WithStepScene<SceneTestContext>;
type StepContext = WithStepScene<SceneTestContext>;

const createUpdate = (): BotStoppedUpdate => ({
  update_type: 'bot_stopped',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createContext = () =>
  Object.assign(new Context(createUpdate(), {} as never), {
    session: {} as Session,
  }) as SceneTestContext;

const installSceneContext = async (
  manager: SceneManager<SceneTestContext>,
  context: SceneTestContext,
): Promise<InstalledSceneContext> => {
  const middleware = manager.middleware as MiddlewareFn<InstalledSceneContext>;
  await middleware(context as InstalledSceneContext, async () => undefined);
  return context as InstalledSceneContext;
};

describe('SceneManager', () => {
  it('добавляет SceneContext и пропускает цепочку без активной сцены', async () => {
    const manager = new SceneManager<SceneTestContext>();
    const context = createContext();
    const next = vi.fn(async () => undefined);

    const installedContext = await installSceneContext(manager, context);
    const intercept =
      manager.middlewareIntercept as MiddlewareFn<InstalledSceneContext>;
    await intercept(installedContext, next);

    expect(installedContext.scene.current).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('входит в step-сцену, хранит state и выполняет первый шаг', async () => {
    const firstStep = vi.fn(async (ctx: StepContext) => {
      ctx.scene.state.name = 'Max';
    });
    const scene = new StepScene<SceneTestContext>('signup', [firstStep]);
    const manager = new SceneManager<SceneTestContext>({ scenes: [scene] });
    const context = createContext();

    const installedContext = await installSceneContext(manager, context);
    await installedContext.scene.enter('signup');

    expect(installedContext.scene.current).toBe(scene);
    expect(context.session.__scene).toMatchObject({
      current: 'signup',
      state: { name: 'Max' },
      firstTime: false,
    });
    expect(firstStep).toHaveBeenCalledOnce();
  });

  it('intercept повторно запускает активную step-сцену вместо next', async () => {
    const step = vi.fn(async () => undefined);
    const scene = new StepScene<SceneTestContext>('signup', [step]);
    const manager = new SceneManager<SceneTestContext>({ scenes: [scene] });
    const context = createContext();
    const next = vi.fn(async () => undefined);

    const installedContext = await installSceneContext(manager, context);
    await installedContext.scene.enter('signup');
    const intercept =
      manager.middlewareIntercept as MiddlewareFn<InstalledSceneContext>;
    await intercept(installedContext, next);

    expect(step).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
  });

  it('переходит к следующему шагу и корректно меняет firstTime', async () => {
    const events: string[] = [];
    const scene = new StepScene<SceneTestContext>('signup', [
      async (ctx) => {
        events.push(`first:${ctx.scene.step.firstTime}`);
        await ctx.scene.step.next();
      },
      async (ctx) => {
        events.push(`second:${ctx.scene.step.firstTime}`);
      },
    ]);
    const manager = new SceneManager<SceneTestContext>({ scenes: [scene] });
    const context = createContext();

    const installedContext = await installSceneContext(manager, context);
    await installedContext.scene.enter('signup');

    expect(events).toEqual(['first:true', 'second:true']);
    expect(context.session.__scene).toMatchObject({
      current: 'signup',
      stepId: 1,
      firstTime: false,
    });
  });

  it('выходит из сцены, передаёт canceled и очищает session state', async () => {
    const leaveHandler = vi.fn(async (ctx: StepContext) => {
      expect(ctx.scene.canceled).toBe(true);
    });
    const scene = new StepScene<SceneTestContext>('signup', {
      steps: [async () => undefined],
      leaveHandler,
    });
    const manager = new SceneManager<SceneTestContext>({ scenes: [scene] });
    const context = createContext();

    const installedContext = await installSceneContext(manager, context);
    await installedContext.scene.enter('signup');
    await installedContext.scene.leave({ canceled: true });

    expect(leaveHandler).toHaveBeenCalledOnce();
    expect(context.session.__scene).toBeUndefined();
    expect(installedContext.scene.current).toBeUndefined();
  });

  it('молча входит и выходит из сцены без вызова handlers', async () => {
    const enterHandler = vi.fn(async () => undefined);
    const leaveHandler = vi.fn(async () => undefined);
    const scene = new StepScene<SceneTestContext>('signup', {
      steps: [async () => undefined],
      enterHandler,
      leaveHandler,
    });
    const manager = new SceneManager<SceneTestContext>({ scenes: [scene] });
    const context = createContext();

    const installedContext = await installSceneContext(manager, context);
    await installedContext.scene.enter('signup', {
      silent: true,
      state: { name: 'Max' },
    });
    await installedContext.scene.leave({ silent: true });

    expect(enterHandler).not.toHaveBeenCalled();
    expect(leaveHandler).not.toHaveBeenCalled();
    expect(context.session.__scene).toBeUndefined();
  });
});
