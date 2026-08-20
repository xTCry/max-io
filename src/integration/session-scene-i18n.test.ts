import { describe, expect, it, vi } from 'vitest';

import { Context } from '../core/context';
import type { MiddlewareFn, NextFn } from '../core/middleware';
import type { BotStartedUpdate } from '../core/network/api';
import type { I18nContext, ISessionContext as I18nSession } from '../i18n';
import { I18n } from '../i18n/i18n';
import { SceneManager } from '../scene/scene-manager';
import { StepScene } from '../scene/scenes/step';
import type { ISessionContainer, WithStepScene } from '../scene/types';
import { SessionManager } from '../session/session-manager';
import { MemoryStorage } from '../session/storages/memory';
import type { ISessionContext as SessionControl } from '../session/types';

type Session = I18nSession &
  ISessionContainer<{ name?: string }> &
  SessionControl & {
    visits?: number;
  };

type AppContext = Context & {
  session: Session;
  i18n: I18nContext;
};

type AppSceneContext = WithStepScene<AppContext>;

const createUpdate = (locale: string): BotStartedUpdate => ({
  update_type: 'bot_started',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  user_locale: locale,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createContext = (locale: string) =>
  new Context(createUpdate(locale), {} as never) as unknown as AppContext;

const asMiddleware = <C extends Context>(middleware: unknown) =>
  middleware as MiddlewareFn<C>;

describe('session + i18n + scene', () => {
  it('восстанавливает язык и state сцены на следующем update', async () => {
    const storage = new MemoryStorage();
    const sessions = new SessionManager<Session, AppContext>({ storage });
    const i18n = new I18n({ useSession: true });
    i18n.loadLocale('ru', { step: 'Русский шаг' });
    i18n.loadLocale('en', { step: 'English step' });

    const firstStep = vi.fn(async (ctx: AppSceneContext) => {
      if (ctx.scene.step.firstTime) {
        ctx.scene.state.name = 'Max';
      }
    });
    const scene = new StepScene<AppContext>('profile', [firstStep]);
    const sceneManager = new SceneManager<AppContext>({ scenes: [scene] });

    const firstContext = createContext('ru');
    await asMiddleware<AppContext>(sessions.middleware)(
      firstContext,
      async () => {
        await asMiddleware<AppContext>(i18n.middleware)(
          firstContext,
          async () => {
            await asMiddleware<AppSceneContext>(sceneManager.middleware)(
              firstContext as AppSceneContext,
              async () => {
                firstContext.session.visits = 1;
                await (firstContext as AppSceneContext).scene.enter('profile');
                firstContext.i18n.locale('en');
              },
            );
          },
        );
      },
    );

    const secondContext = createContext('ru');
    const terminal: NextFn = vi.fn(async () => undefined);
    await asMiddleware<AppContext>(sessions.middleware)(
      secondContext,
      async () => {
        await asMiddleware<AppContext>(i18n.middleware)(
          secondContext,
          async () => {
            await asMiddleware<AppSceneContext>(sceneManager.middleware)(
              secondContext as AppSceneContext,
              async () => {
                await asMiddleware<AppSceneContext>(
                  sceneManager.middlewareIntercept,
                )(secondContext as AppSceneContext, terminal);
              },
            );
          },
        );
      },
    );

    expect(firstStep).toHaveBeenCalledTimes(2);
    expect(firstStep).toHaveBeenLastCalledWith(
      expect.objectContaining({
        i18n: expect.objectContaining({ languageCode: 'en' }),
        scene: expect.objectContaining({ state: { name: 'Max' } }),
      }),
    );
    expect(secondContext.session.visits).toBe(1);
    expect(secondContext.i18n.t('step')).toBe('English step');
    expect(terminal).not.toHaveBeenCalled();
  });

  it('сохраняет общую session после завершения сцены', async () => {
    const storage = new MemoryStorage();
    const sessions = new SessionManager<Session, AppContext>({ storage });
    const i18n = new I18n({ useSession: true });
    i18n.loadLocale('en', { done: 'Done' });
    const scene = new StepScene<AppContext>('profile', [async () => undefined]);
    const sceneManager = new SceneManager<AppContext>({ scenes: [scene] });
    const context = createContext('en');

    await asMiddleware<AppContext>(sessions.middleware)(context, async () => {
      await asMiddleware<AppContext>(i18n.middleware)(context, async () => {
        await asMiddleware<AppSceneContext>(sceneManager.middleware)(
          context as AppSceneContext,
          async () => {
            context.session.visits = 2;
            await (context as AppSceneContext).scene.enter('profile');
            await (context as AppSceneContext).scene.leave();
          },
        );
      });
    });

    const stored = await storage.get('max-io:42:7');
    expect(stored).toEqual({ __language_code: 'en', visits: 2 });
  });
});
