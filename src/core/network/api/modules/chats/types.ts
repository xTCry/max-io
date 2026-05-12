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

/** DTO запроса списка чатов, где бот участвовал или участвует. */
export type GetAllChatsDTO = {
  query: {
    /** Максимальное количество чатов в ответе. */
    count?: number;
    /** Маркер следующей страницы. */
    marker?: number | null;
  };
};

/** Параметры метода `api.getAllChats`. */
export type GetAllChatsExtra = FlattenReq<GetAllChatsDTO>;

type DefaultPath = {
  /** ID чата. У групповых чатов может быть отрицательным. */
  chat_id: number;
};

/** Ответ со списком чатов. */
export type GetAllChatsResponse = {
  /** Страница чатов. */
  chats: Chat[];
  /** Маркер следующей страницы или `null`, если данных больше нет. */
  marker: number | null;
};

/** DTO запроса чата по ID. */
export type GetChatByIdDTO = {
  path: DefaultPath;
};

export type GetChatByIdResponse = Chat;

/** DTO удаления группового чата для всех участников. */
export type DeleteChatDTO = {
  path: DefaultPath;
};

export type DeleteChatResponse = ActionResponse;

/** DTO изменения информации группового чата. */
export type EditChatInfoDTO = {
  path: DefaultPath;
  body: {
    /** Новая иконка чата. */
    icon?: PhotoAttachmentRequestPayload | null;
    /** Новое название чата. */
    title?: string | null;
    /** ID сообщения, которое нужно закрепить. */
    pin?: string | null;
    /** Нужно ли отправлять уведомление участникам. */
    notify?: boolean | null;
  };
};

/** Параметры метода `api.editChatInfo` без `chatId`. */
export type EditChatExtra = Omit<FlattenReq<EditChatInfoDTO>, 'chat_id'>;

export type EditChatInfoResponse = Chat;

/** DTO отправки действия бота в чат. */
export type SendActionDTO = {
  path: DefaultPath;
  body: {
    /** Действие, которое клиент покажет участникам чата. */
    action: SenderAction;
  };
};

export type SendActionResponse = ActionResponse;

/** DTO запроса закреплённого сообщения. */
export type GetPinnedMessageDTO = {
  path: DefaultPath;
};

/** Ответ с закреплённым сообщением. */
export type GetPinnedMessageResponse = {
  /** Закреплённое сообщение или `null`, если закрепа нет. */
  message: Message | null;
};

/** DTO закрепления сообщения. */
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

/** DTO снятия закреплённого сообщения. */
export type UnpinMessageDTO = {
  path: DefaultPath;
};

export type UnpinMessageResponse = ActionResponse;

/** DTO получения информации о текущем боте как участнике чата. */
export type GetChatMembershipDTO = {
  path: DefaultPath;
};

export type GetChatMembershipResponse = ChatMember;

/** DTO выхода бота из чата. */
export type LeaveChatDTO = {
  path: DefaultPath;
};

export type LeaveChatResponse = ActionResponse;

/** DTO получения списка администраторов чата. */
export type GetChatAdminsDTO = {
  path: DefaultPath;
};

/** Ответ со списком администраторов чата. */
export type GetChatAdminsResponse = {
  /** Администраторы чата. */
  members: ChatMember[];
  /** Маркер следующей страницы, если сервер вернул пагинацию. */
  marker?: number | null;
};

/** Администратор, которого нужно назначить или обновить через `setChatAdmins`. */
export type ChatAdmin = {
  /** ID пользователя-участника чата, которому назначаются права администратора. Максимум — 50 администраторов в чате. */
  user_id: number;
  /** Перечень прав доступа пользователя. При повторном назначении обновляет текущие права администратора. */
  permissions: ChatAdminApiPermission[];
  /** Заголовок, который будет показан в клиенте; если не задан, клиент подставляет “владелец” или “админ”. */
  alias?: string | null;
};

export type SetChatAdminsDTO = {
  path: DefaultPath;
  body: {
    /** Список назначаемых или обновляемых администраторов. */
    admins: ChatAdmin[];
    /** Маркер для пагинации, если сервер использует его в этом методе. */
    marker?: number | null;
  };
};

export type SetChatAdminsResponse = ActionResponse;

export type DeleteChatAdminDTO = {
  path: DefaultPath & {
    /** ID пользователя, у которого нужно снять права администратора. */
    user_id: number;
  };
};

export type DeleteChatAdminResponse = ActionResponse;

/** DTO получения участников чата. */
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

/** DTO добавления пользователей в чат. */
export type AddChatMembersDTO = {
  path: DefaultPath;
  body: {
    /** ID пользователей, которых нужно добавить. */
    user_ids: number[];
  };
};

/** Результат добавления пользователей в чат. */
export type AddChatMembersResponse = ActionResponse & {
  /** ID пользователей, которых не удалось добавить. */
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
          | 'add.participant.privacy'
          | 'add.participant.not.found'
          | string;
        /** ID пользователей, к которым относится ошибка. */
        user_ids: number[];
      }[]
    | null;
};

/** DTO удаления пользователя из чата. */
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
