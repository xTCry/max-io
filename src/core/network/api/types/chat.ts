export type ChatType = 'dialog' | 'chat' | 'channel';

export type ChatStatus = 'active' | 'removed' | 'left' | 'closed' | 'suspended';

export type Chat = {
  chat_id: number;
  type: ChatType;
  status: ChatStatus;
  title: string | null;
  icon: { url: string } | null;
  last_event_time: number;
  participants_count: number;
  owner_id?: number | null;
  participants?: { [key: string]: number | undefined } | null;
  is_public: boolean;
  link?: string | null;
  description?: string | null;
  dialog_with_user?: {} | null;
  messages_count?: number | null;
  chat_message_id?: string | null;
  pinned_message?: object | null;
};

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

export type ChatMember = {
  user_id: number;
  name: string;
  username: string | null;
  is_bot: boolean;
  last_activity_time: number;
  description?: string | null;
  avatar_url?: string;
  full_avatar_url?: string;
  last_access_time: number;
  is_owner: boolean;
  is_admin: boolean;
  join_time: number;
  permissions: ChatAdminPermission[] | null;
};
