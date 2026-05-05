import type { Chat } from './chat';
import type { ConstructedMessage, Message } from './message';
import type { User, UserLocale, UserWithPhoto } from './user';

type MakeUpdate<Type extends string, Payload extends object> = {
  /** Тип события. */
  update_type: Type;
  /** Время события, Unix timestamp в миллисекундах. */
  timestamp: number;
} & {
  [key in keyof Payload]: Payload[key];
};

/** Update нажатия callback-кнопки. */
export type MessageCallbackUpdate = MakeUpdate<
  'message_callback',
  {
    /** Данные callback-кнопки. */
    callback: {
      /** Время нажатия кнопки, Unix timestamp в миллисекундах. */
      timestamp: number;
      /** ID callback для ответа через `answerOnCallback`. */
      callback_id: string;
      /** Max len `1024` */
      payload?: string;
      /** Пользователь, нажавший кнопку. */
      user: User;
    };
    /** Сообщение, на котором была нажата кнопка. */
    message?: Message | null;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale | null;
  }
>;

/** Update создания сообщения. */
export type MessageCreatedUpdate = MakeUpdate<
  'message_created',
  {
    /** Созданное сообщение. */
    message: Message;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale | null;
  }
>;

/** Update удаления сообщения. */
export type MessageRemovedUpdate = MakeUpdate<
  'message_removed',
  {
    /** ID удалённого сообщения. */
    message_id: string;
    /** ID чата, где было удалено сообщение. */
    chat_id: number;
    /** ID пользователя, связанного с событием удаления. */
    user_id: number;
  }
>;

/** Update редактирования сообщения. */
export type MessageEditedUpdate = MakeUpdate<
  'message_edited',
  {
    /** Обновлённое сообщение. */
    message: Message;
  }
>;

/** Update добавления бота в чат. */
export type BotAddedUpdate = MakeUpdate<
  'bot_added',
  {
    /** ID чата. */
    chat_id: number;
    /** Пользователь, добавивший бота. */
    user: User;
    /** `true`, если событие произошло в канале. */
    is_channel: boolean;
  }
>;

/** Update удаления бота из чата. */
export type BotRemovedUpdate = MakeUpdate<
  'bot_removed',
  {
    /** ID чата. */
    chat_id: number;
    /** Пользователь, удаливший бота. */
    user: User;
    /** `true`, если событие произошло в канале. */
    is_channel: boolean;
  }
>;

/** Update добавления пользователя в чат. */
export type UserAddedUpdate = MakeUpdate<
  'user_added',
  {
    /** ID чата. */
    chat_id: number;
    /** Добавленный пользователь. */
    user: User;
    /** ID пользователя, который добавил участника. */
    inviter_id?: number | null;
    /** `true`, если событие произошло в канале. */
    is_channel: boolean;
  }
>;

/** Update удаления пользователя из чата. */
export type UserRemovedUpdate = MakeUpdate<
  'user_removed',
  {
    /** ID чата. */
    chat_id: number;
    /** Удалённый пользователь. */
    user: User;
    /** ID администратора, который удалил участника. */
    admin_id?: number | null;
    /** `true`, если событие произошло в канале. */
    is_channel: boolean;
  }
>;

/** Update запуска бота пользователем. */
export type BotStartedUpdate = MakeUpdate<
  'bot_started',
  {
    /** ID диалога или чата. */
    chat_id: number;
    /** Пользователь, запустивший бота. */
    user: User | UserWithPhoto;
    /** Payload запуска, если пользователь пришёл по deep link. */
    payload?: string | null;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale;
  }
>;

/** Update изменения названия чата. */
export type ChatTitleChangedUpdate = MakeUpdate<
  'chat_title_changed',
  {
    /** ID чата. */
    chat_id: number;
    /** Пользователь, изменивший название. */
    user: User;
    /** Новое название чата. */
    title: string;
  }
>;

/** Update запроса на конструирование сообщения клиентом. */
export type MessageConstructionRequestUpdate = MakeUpdate<
  'message_construction_request',
  {
    /** Пользователь, открывший сценарий конструирования сообщения. */
    user: User;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale;
    /** ID сессии конструирования сообщения. */
    session_id: string;
    /** Payload сценария. */
    data?: string | null;
    /** Входные данные сценария от клиента. */
    input: unknown;
  }
>;

/** Update сообщения, сконструированного клиентом. */
export type MessageConstructedUpdate = MakeUpdate<
  'message_constructed',
  {
    /** Пользователь, сконструировавший сообщение. */
    user: User;
    /** ID сессии конструирования сообщения. */
    session_id: string;
    /** Сконструированное сообщение. */
    message: ConstructedMessage;
  }
>;

/** Update создания чата через кнопку создания чата. */
export type MessageChatCreatedUpdate = MakeUpdate<
  'message_chat_created',
  {
    /** Созданный чат. */
    chat: Chat;
    /** ID сообщения с кнопкой, через которую создан чат. */
    message_id: string;
    /** Payload запуска, если он был задан в кнопке. */
    start_payload?: string | null;
  }
>;

/** Все поддерживаемые типы updates. */
export type UpdateType = Update['update_type'];

/** Update, суженный по строковому типу события. */
export type FilteredUpdate<Type extends UpdateType> =
  Type extends 'message_callback'
    ? MessageCallbackUpdate
    : Type extends 'message_created'
      ? MessageCreatedUpdate
      : Type extends 'message_removed'
        ? MessageRemovedUpdate
        : Type extends 'message_edited'
          ? MessageEditedUpdate
          : Type extends 'bot_added'
            ? BotAddedUpdate
            : Type extends 'bot_removed'
              ? BotRemovedUpdate
              : Type extends 'user_added'
                ? UserAddedUpdate
                : Type extends 'user_removed'
                  ? UserRemovedUpdate
                  : Type extends 'bot_started'
                    ? BotStartedUpdate
                    : Type extends 'chat_title_changed'
                      ? ChatTitleChangedUpdate
                      : Type extends 'message_construction_request'
                        ? MessageConstructionRequestUpdate
                        : Type extends 'message_constructed'
                          ? MessageConstructedUpdate
                          : Type extends 'message_chat_created'
                            ? MessageChatCreatedUpdate
                            : never;

/** Поддерживаемые updates Bot API. */
export type Update =
  | MessageCallbackUpdate
  | MessageCreatedUpdate
  | MessageRemovedUpdate
  | MessageEditedUpdate
  | BotAddedUpdate
  | BotRemovedUpdate
  | UserAddedUpdate
  | UserRemovedUpdate
  | BotStartedUpdate
  | ChatTitleChangedUpdate
  | MessageConstructionRequestUpdate
  | MessageConstructedUpdate
  | MessageChatCreatedUpdate;
