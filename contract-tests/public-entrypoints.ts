import {
  Bot,
  Context,
  type Middleware,
} from 'max-io';
import type {
  BotAdminPermissionsChangedUpdate,
  BotInfo,
  ChatAdminPermission,
  MessageCreatedUpdate,
  SendMessageExtra,
  Update,
  UpdateType,
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

  if (ctx.has('bot_admin_permissions_changed')) {
    const permissionsUpdate: BotAdminPermissionsChangedUpdate = ctx.update;
    const chatId: number = ctx.chatId;
    const permissions: ChatAdminPermission[] | null | undefined =
      ctx.update.permissions;
    void permissionsUpdate;
    void chatId;
    void permissions;
  }

  await next();
};

const update: Update | undefined = undefined;
const botInfo: BotInfo | undefined = undefined;
const allowedUpdates: UpdateType[] = ['bot_admin_permissions_changed'];
const permissionsUpdate: BotAdminPermissionsChangedUpdate = {
  update_type: 'bot_admin_permissions_changed',
  timestamp: 1,
  chat_id: 42,
  user_id: 7,
  bot_id: 100,
  is_channel: true,
  is_admin: true,
  permissions: null,
};

bot.on('bot_admin_permissions_changed', (ctx) => {
  const userId: number = ctx.update.user_id;
  void userId;
});

void sceneMiddleware;
void verifyUpdateNarrowing;
void update;
void botInfo;
void allowedUpdates;
void permissionsUpdate;
