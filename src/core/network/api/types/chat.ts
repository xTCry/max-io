/** Тип чата в Max: диалог, групповой чат или канал. */
export type ChatType = 'dialog' | 'chat' | 'channel';

/** Статус чата относительно текущего бота. */
export type ChatStatus = 'active' | 'removed' | 'left' | 'closed' | 'suspended';

/** Информация о чате, диалоге или канале. */
export type Chat = {
  /** ID чата. У групповых чатов обычно отрицательный. */
  chat_id: number;
  /** Тип чата. */
  type: ChatType;
  /** Статус участия текущего бота в чате. */
  status: ChatStatus;
  /** Название чата. Для диалогов может быть `null`. */
  title: string | null;
  /** Иконка чата. */
  icon: { url: string } | null;
  /** Время последнего события в чате, Unix timestamp в миллисекундах. */
  last_event_time: number;
  /** Количество участников. Для диалога обычно `2`. */
  participants_count: number;
  /** ID владельца чата, если сервер вернул это поле. */
  owner_id?: number | null;
  /** Карта участников с временем последней активности; может не возвращаться в списке чатов. */
  participants?: { [key: string]: number | undefined } | null;
  /** `true`, если чат доступен публично. */
  is_public: boolean;
  /** Публичная ссылка на чат, если она настроена. */
  link?: string | null;
  /** Описание чата. */
  description?: string | null;
  /** Данные собеседника для чатов типа `dialog`. */
  dialog_with_user?: {} | null;
  /** Количество сообщений, если сервер вернул статистику чата. */
  messages_count?: number | null;
  /** ID сообщения с кнопкой, через которую был создан чат. */
  chat_message_id?: string | null;
  /** Закреплённое сообщение, если запрошен конкретный чат. */
  pinned_message?: object | null;
};

/** Действие, которое бот может показать в чате: печатает, отправляет файл и т.п. */
export type SenderAction =
  | 'typing_on'
  | 'sending_photo'
  | 'sending_video'
  | 'sending_audio'
  | 'sending_file'
  | 'mark_seen';

/** Права администратора, описанные в Bot API для назначения через setChatAdmins. */
export const CHAT_ADMIN_API_PERMISSIONS = [
  'read_all_messages',
  'add_remove_members',
  'add_admins',
  'change_chat_info',
  'pin_message',
  'write',
  'can_call',
  'edit_link',
  'post_edit_delete_message',
  'edit_message',
  'delete_message',
] as const;

/** Права, которые обычный admin-бот успешно назначал при ручной проверке. */
export const CHAT_ADMIN_REGULAR_BOT_ASSIGNABLE_PERMISSIONS = [
  'add_remove_members',
  'can_call',
  'edit_link',
  'read_all_messages',
  'pin_message',
  'change_chat_info',
  'write',
] as const;

/** Права, которые сервер может вернуть у владельца чата, но обычный admin-бот их не назначает. */
export const CHAT_ADMIN_OWNER_PERMISSIONS = [
  'edit',
  'view_stats',
  'delete',
] as const;

/** Полный известный набор прав, которые могут приходить от сервера. */
export const CHAT_ADMIN_PERMISSIONS = [
  ...CHAT_ADMIN_API_PERMISSIONS,
  ...CHAT_ADMIN_OWNER_PERMISSIONS,
] as const;

/** Право администратора, которое можно передавать в setChatAdmins согласно Bot API. */
export type ChatAdminApiPermission =
  (typeof CHAT_ADMIN_API_PERMISSIONS)[number];

/** Право владельца чата, которое может прийти от сервера в списке участников. */
export type ChatAdminOwnerPermission =
  (typeof CHAT_ADMIN_OWNER_PERMISSIONS)[number];

/** Полный известный набор прав администратора группового чата. */
export type ChatAdminPermission = (typeof CHAT_ADMIN_PERMISSIONS)[number];

/** @deprecated Используйте ChatAdminPermission. */
export type ChatPermissions = ChatAdminPermission;

/** Участник чата с данными о правах и времени активности в чате. */
export type ChatMember = {
  /** ID пользователя или бота. */
  user_id: number;
  /** Отображаемое имя. */
  name: string;
  /** Публичный username, если он доступен. */
  username: string | null;
  /** `true`, если участник является ботом. */
  is_bot: boolean;
  /** Время последней активности в Max, Unix timestamp в миллисекундах. */
  last_activity_time: number;
  /** Описание профиля участника. */
  description?: string | null;
  /** URL уменьшенного аватара. */
  avatar_url?: string;
  /** URL полного аватара. */
  full_avatar_url?: string;
  /** Время последней активности в этом чате. */
  last_access_time: number;
  /** `true`, если участник является владельцем чата. */
  is_owner: boolean;
  /** `true`, если участник является администратором чата. */
  is_admin: boolean;
  /** Время вступления в чат, Unix timestamp в миллисекундах. */
  join_time: number;
  /** Права участника в чате. Для обычных участников может быть `null`. */
  permissions: ChatAdminPermission[] | null;
};
