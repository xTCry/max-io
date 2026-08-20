import {
  Bot,
  Context,
  type Middleware,
} from 'max-io';
import type {
  BotInfo,
  MessageCreatedUpdate,
  SendMessageExtra,
  Update,
} from 'max-io/types';
import { I18n, type I18nContext } from 'max-io/lib/i18n';
import { SceneManager, type IScene, type WithScene } from 'max-io/lib/scene';
import { MemoryStorage, SessionManager } from 'max-io/lib/session';

type Session = {
  visits: number;
  __scene?: {
    current: string;
    firstTime: boolean;
    state?: Record<string, unknown>;
  };
};

type Translations = {
  greeting: { name: string };
};

class CustomContext extends Context {
  declare session: Session;

  declare readonly i18n: I18nContext<Translations>;

  declare state: Context['state'] & { requestId?: string };

  async replyWithGreeting(name: string, extra?: SendMessageExtra) {
    return this.reply(this.i18n.t('greeting', { name }), extra);
  }
}

const bot = new Bot<CustomContext>('test-token', {
  contextType: CustomContext,
});
const session = new SessionManager<Session, CustomContext>({
  storage: new MemoryStorage(),
  defaultSession: () => ({ visits: 0 }),
});
const scene: IScene<CustomContext> = {
  slug: 'profile',
  enterHandler: async () => undefined,
  leaveHandler: async () => undefined,
};
const scenes = new SceneManager<CustomContext>({ scenes: [scene] });
const i18n = new I18n<Translations, CustomContext>({
  defaultLanguage: 'ru',
});

const sessionMiddleware: Middleware<CustomContext> = session.middleware;
const i18nMiddleware: Middleware<CustomContext> = i18n.middleware;
const sceneMiddleware: Middleware<WithScene<CustomContext>> = scenes.middleware;

bot.use(sessionMiddleware, i18nMiddleware);

const verifyUpdateNarrowing: Middleware<Context> = async (ctx, next) => {
  if (ctx.has('message_created')) {
    const update: MessageCreatedUpdate = ctx.update;
    void update;
  }

  await next();
};

const update: Update | undefined = undefined;
const botInfo: BotInfo | undefined = undefined;

void sceneMiddleware;
void verifyUpdateNarrowing;
void update;
void botInfo;
