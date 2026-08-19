import type {
  ActionResponse,
  Chat,
  ChatAdminApiPermission,
  ChatMember,
  Message,
  PhotoAttachmentRequestPayload,
  SenderAction,
} from '../../types';
import type { FlattenReq } from '../types';

/**
 * DTO запроса списка групповых чатов и каналов.
 *
 * @deprecated С июня 2026 API не поддерживает `GET /chats`; сохраняйте `chat_id` из updates.
 */
export type GetAllChatsDTO = {
  query: {
    /** Максимальное количество чатов в ответе. */
    count?: number;
    /** Маркер следующей страницы. */
    marker?: number | null;
  };
};

/** @deprecated Параметры устаревшего метода `api.getAllChats`. */
export type GetAllChatsExtra = FlattenReq<GetAllChatsDTO>;

type DefaultPath = {
  /** ID чата. У групповых чатов может быть отрицательным. */
  chat_id: number;
};

/** @deprecated Ответ устаревшего `GET /chats`. */
export type GetAllChatsResponse = {
  /** Страница чатов. */
  chats: Chat[];
  /** Маркер следующей страницы или `null`|`undefined`, если данных больше нет. */
  marker?: number | null;
};

/** DTO запроса чата по ID. */
export type GetChatByIdDTO = {
  path: DefaultPath;
};

export type GetChatByIdResponse = Chat;

/**
 * DTO запроса канала по публичной ссылке.
 *
 * @deprecated Endpoint отсутствует в схеме Bot API 0.0.33.
 * Ручная проверка `GET /chats/max_news` на основном endpoint 23 июля 2026 года вернула `404 chat.not.found`.
 * Оставлен для обратной совместимости.
 */
export type GetChatByLinkDTO = {
  path: {
    /** Публичная ссылка на канал. */
    chat_link: string;
  };
};

/**
 * @deprecated Используется только устаревшим методом `getChatByLink`.
 */
export type GetChatByLinkResponse = Chat;

/** DTO удаления группового чата или канала для всех участников. */
export type DeleteChatDTO = {
  path: DefaultPath;
};

export type DeleteChatResponse = ActionResponse;

/** DTO изменения информации группового чата или канала. */
export type EditChatInfoDTO = {
  path: DefaultPath;
  body: {
    /** Новый аватар чата или канала. */
    icon?: PhotoAttachmentRequestPayload | null;
    /** Новое название чата. */
    title?: string | null;
    /** ID сообщения или поста для закрепления. Для снятия закрепа используйте отдельный DELETE-метод. */
    pin?: string | null;
    /** Нужно ли отправлять уведомление участникам. */
    notify?: boolean | null;
  };
};

/** Параметры метода `api.editChatInfo` без `chatId`. */
export type EditChatExtra = Omit<FlattenReq<EditChatInfoDTO>, 'chat_id'>;

export type EditChatInfoResponse = Chat;

/** DTO отправки действия бота в групповой чат. */
export type SendActionDTO = {
  path: DefaultPath;
  body: {
    /** Действие, которое клиент покажет участникам чата. */
    action: SenderAction;
  };
};

export type SendActionResponse = ActionResponse;

/** DTO запроса закреплённого сообщения или поста. */
export type GetPinnedMessageDTO = {
  path: DefaultPath;
};

/** Ответ с закреплённым сообщением. */
export type GetPinnedMessageResponse = {
  /** Закреплённое сообщение или пост, либо `null`, если закрепа нет. */
  message: Message | null;
};

/** DTO закрепления сообщения или поста. */
export type PinMessageDTO = {
  path: DefaultPath;
  body: {
    /** ID сообщения для закрепления. */
    message_id: string;
    /** Нужно ли отправлять уведомление участникам. */
    notify?: boolean | null;
  };
};

/** Параметры метода `api.pinMessage` без `chatId` и `messageId`. */
export type PinMessageExtra = Omit<
  FlattenReq<PinMessageDTO>,
  'chat_id' | 'message_id'
>;

export type PinMessageResponse = ActionResponse;

/** DTO снятия закреплённого сообщения или поста. */
export type UnpinMessageDTO = {
  path: DefaultPath;
};

export type UnpinMessageResponse = ActionResponse;

/** DTO получения информации о текущем боте как участнике группового чата или канала. */
export type GetChatMembershipDTO = {
  path: DefaultPath;
};

export type GetChatMembershipResponse = ChatMember;

/** DTO выхода бота из группового чата или канала. */
export type LeaveChatDTO = {
  path: DefaultPath;
};

export type LeaveChatResponse = ActionResponse;

/** DTO получения списка администраторов группового чата или канала. */
export type GetChatAdminsDTO = {
  path: DefaultPath;
};

/** Ответ со списком администраторов группового чата или канала. */
export type GetChatAdminsResponse = {
  /** Администраторы чата. */
  members: ChatMember[];
  /** Маркер следующей страницы, если сервер вернул пагинацию. */
  marker?: number | null;
};

/** Администратор, которого нужно назначить или обновить через `setChatAdmins`. */
export type ChatAdmin = {
  /** ID участника чата или подписчика канала. Максимум — 50 администраторов. */
  user_id: number;
  /** Полный перечень прав. Повторное назначение полностью заменяет текущие права администратора. */
  permissions: ChatAdminApiPermission[];
  /** Заголовок, который будет показан в клиенте; если не задан, клиент подставляет “владелец” или “админ”. */
  alias?: string | null;
};

/** DTO назначения или полной замены прав администраторов. */
export type SetChatAdminsDTO = {
  path: DefaultPath;
  body: {
    /** Список назначаемых или обновляемых администраторов. */
    admins: ChatAdmin[];
    /** Маркер следующей страницы, если сервер вернул или поддерживает пагинацию. */
    marker?: number | null;
  };
};

export type SetChatAdminsResponse = ActionResponse;

/** DTO снятия прав администратора без исключения из чата или канала. */
export type DeleteChatAdminDTO = {
  path: DefaultPath & {
    /** ID пользователя, у которого нужно снять права администратора. */
    user_id: number;
  };
};

export type DeleteChatAdminResponse = ActionResponse;

/** DTO получения участников группового чата или канала. */
export type GetChatMembersDTO = {
  path: DefaultPath;
  query: {
    /** Список ID пользователей через запятую для фильтрации ответа raw API. */
    user_ids?: string;
    /** Маркер следующей страницы. */
    marker?: number;
    /** Максимальное количество участников в ответе. */
    count?: number;
  };
};

export type GetChatMembersExtra = Omit<
  FlattenReq<GetChatMembersDTO>,
  'chat_id' | 'user_ids'
> & {
  /** Список ID пользователей для фильтрации ответа. */
  user_ids?: number[];
};

/** Ответ со списком участников чата. */
export type GetChatMembersResponse = {
  /** Участники чата. */
  members: ChatMember[];
  /** Маркер следующей страницы, если она есть. */
  marker?: number | null;
};

/** DTO добавления пользователей в групповой чат. Подписчиков канала этим методом добавить нельзя. */
export type AddChatMembersDTO = {
  path: DefaultPath;
  body: {
    /** ID пользователей, которых нужно добавить в групповой чат. */
    user_ids: number[];
  };
};

/** Результат добавления пользователей в групповой чат. */
export type AddChatMembersResponse = ActionResponse & {
  /** ID пользователей, которых не удалось добавить в групповой чат. */
  failed_user_ids?: number[] | null;
  /** Детализация ошибок по пользователям, если сервер её вернул. */
  failed_user_details?:
    | {
        /**
         * Код причины отказа:
         * - `add.participant.privacy` — ошибки конфиденциальности при добавлении пользователей.
         * - `add.participant.not.found` — пользователи не найдены.
         */
        error_code:
          'add.participant.privacy' | 'add.participant.not.found' | string;
        /** ID пользователей, к которым относится ошибка. */
        user_ids: number[];
      }[]
    | null;
};

/** DTO удаления пользователя из группового чата или канала. */
export type RemoveChatMemberDTO = {
  path: DefaultPath;
  query: {
    /** ID пользователя, которого нужно удалить. */
    user_id: number;
    /** `true` блокирует повторный вход по ссылке; `false` только удаляет из чата. */
    block?: boolean;
  };
};

/** Параметры метода `api.removeChatMember` без `chatId` и `userId`. */
export type RemoveChatMemberExtra = Omit<
  FlattenReq<RemoveChatMemberDTO>,
  'chat_id' | 'user_id'
>;

export type RemoveChatMemberResponse = ActionResponse;
