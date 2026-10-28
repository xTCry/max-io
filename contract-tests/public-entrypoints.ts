import { Bot, Context, Keyboard, type Middleware } from 'max-io';
import { I18n, type I18nContext } from 'max-io/lib/i18n';
import { type IScene, SceneManager, type WithScene } from 'max-io/lib/scene';
import { MemoryStorage, SessionManager } from 'max-io/lib/session';
import type {
  Attachment,
  AttachmentRequest,
  BotAdminPermissionsChangedUpdate,
  BotInfo,
  Chat,
  ChatAdminPermission,
  MessageCreatedUpdate,
  SenderAction,
  SendMessageExtra,
  Update,
  UpdateType,
} from 'max-io/types';
// @ts-expect-error Устаревший алиас прав больше не экспортируется.
import type { ChatPermissions } from 'max-io/types';
// @ts-expect-error Устаревшие действия больше не экспортируются.
import type { DeprecatedSenderAction } from 'max-io/types';

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

// @ts-expect-error Reply keyboard больше не поддерживается библиотекой.
Keyboard.replyKeyboard([]);
// @ts-expect-error Удалённые reply-кнопки не входят в публичный API.
Keyboard.button.sendMessage('test');
// @ts-expect-error Удалённые reply-кнопки не входят в публичный API.
Keyboard.button.sendContact('test');
// @ts-expect-error Удалённые reply-кнопки не входят в публичный API.
Keyboard.button.sendGeoLocation('test');
// @ts-expect-error Legacy-кнопка chat больше не входит в публичный API.
Keyboard.button.chat('test', 'chat');
const removedReplyAttachment: AttachmentRequest = {
  // @ts-expect-error Reply keyboard не входит в тип исходящих вложений.
  type: 'reply_keyboard',
  buttons: [],
};
// @ts-expect-error Data attachment не входит в тип входящих вложений.
const removedDataAttachment: Attachment = { type: 'data', data: 'test' };
void removedReplyAttachment;
void removedDataAttachment;

// @ts-expect-error Удалённый метод списка чатов не входит в публичный API.
bot.api.getAllChats();
// @ts-expect-error Удалённый поиск по ссылке не входит в публичный API.
bot.api.getChatByLink('channel');
// @ts-expect-error Удалённый raw-метод не входит в публичный API.
bot.api.raw.chats.getAll({});
// @ts-expect-error Удалённый raw-метод не входит в публичный API.
bot.api.raw.chats.getByLink({ chat_link: 'channel' });

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
// @ts-expect-error Удалённое событие не должно входить в типы updates.
const legacyUpdate: UpdateType = 'message_constructed';
// @ts-expect-error Удалённое событие не должно входить в типы updates.
const legacyConstruction: UpdateType = 'message_construction_request';
// @ts-expect-error Удалённое событие не должно входить в типы updates.
const legacyChat: UpdateType = 'message_chat_created';
// @ts-expect-error Удалённое действие отсутствует в схеме.
const legacyAction: SenderAction = 'mark_seen';
// @ts-expect-error Удалённое поле чата не входит в публичный тип.
type LegacyChatMessage = Chat['chat_message_id'];
void legacyUpdate;
void legacyConstruction;
void legacyChat;
void legacyAction;
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
