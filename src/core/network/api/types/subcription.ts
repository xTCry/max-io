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

/** Update нажатия inline callback-кнопки. */
export type MessageCallbackUpdate = MakeUpdate<
  'message_callback',
  {
    /** Данные callback-кнопки. */
    callback: {
      /** Время нажатия кнопки, Unix timestamp в миллисекундах. */
      timestamp: number;
      /** ID callback-запроса для ответа через `answerOnCallback`. */
      callback_id: string;
      /** Payload нажатой кнопки. Ограничение API: до `1024` символов. */
      payload?: string;
      /** Пользователь, нажавший кнопку. */
      user: User;
    };
    /** Сообщение или пост, на котором была нажата кнопка; в некоторых сценариях равно `null`. */
    message: Message | null;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale | null;
  }
>;

/** Update нового сообщения, поста в канале или комментария. */
export type MessageCreatedUpdate = MakeUpdate<
  'message_created',
  {
    /** Созданное сообщение. */
    message: Message;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale | null;
  }
>;

/** Update удаления сообщения или поста. */
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

/** Update редактирования сообщения или поста. */
export type MessageEditedUpdate = MakeUpdate<
  'message_edited',
  {
    /** Обновлённое сообщение. */
    message: Message;
  }
>;

/** Update нового комментария к посту в канале. */
export type CommentCreatedUpdate = MakeUpdate<
  'comment_created',
  {
    /** Новый комментарий. Схема Bot API описывает его общим объектом сообщения. */
    message: Message;
  }
>;

/** Update редактирования комментария к посту в канале. */
export type CommentEditedUpdate = MakeUpdate<
  'comment_edited',
  {
    /** Отредактированный комментарий. Схема Bot API описывает его общим объектом сообщения. */
    message: Message;
  }
>;

/** Update удаления комментария к посту в канале. */
export type CommentRemovedUpdate = MakeUpdate<
  'comment_removed',
  {
    /** ID удалённого комментария. */
    message_id: string;
    /** ID канала, где был удалён комментарий. */
    chat_id: number;
    /** ID пользователя или бота, удалившего комментарий. */
    user_id: number;
    /** ID поста в канале. Поле обязательно, но может быть `null`. */
    post_id: string | null;
  }
>;

/** Update добавления бота в групповой чат или канал. */
export type BotAddedUpdate = MakeUpdate<
  'bot_added',
  {
    /** ID чата. */
    chat_id: number;
    /** Пользователь, добавивший бота. */
    user: User;
    /** `true`, если бот добавлен в канал, иначе — в групповой чат. */
    is_channel: boolean;
  }
>;

/** Update удаления бота из группового чата или канала. */
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

/** Update добавления пользователя в групповой чат или канал. */
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

/** Update удаления пользователя из группового чата или канала. */
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

/** Update первого запуска или повторной активации бота пользователем. */
export type BotStartedUpdate = MakeUpdate<
  'bot_started',
  {
    /** ID диалога или чата. */
    chat_id: number;
    /** Пользователь, запустивший бота. */
    user: User | UserWithPhoto;
    /** Payload deep link; строки длиннее 512 символов API не передаёт. */
    payload?: string | null;
    /** Локаль пользователя, если клиент её передал. */
    user_locale?: UserLocale;
  }
>;

/** Update остановки бота пользователем в настройках Max. */
export type BotStoppedUpdate = MakeUpdate<
  'bot_stopped',
  {
    /** ID диалога, где произошло событие. */
    chat_id: number;
    /** Пользователь, который остановил бота. */
    user: User;
    /** Текущий язык пользователя в формате IETF BCP 47. */
    user_locale?: UserLocale | null;
  }
>;

/** Update очистки истории диалога с ботом. */
export type DialogClearedUpdate = MakeUpdate<
  'dialog_cleared',
  {
    /** ID чата, где произошло событие. */
    chat_id: number;
    /** Пользователь, который очистил историю диалога. */
    user: User;
    /** Текущий язык пользователя в формате IETF BCP 47. */
    user_locale?: UserLocale | null;
  }
>;

/** Update отключения уведомлений в диалоге с ботом. */
export type DialogMutedUpdate = MakeUpdate<
  'dialog_muted',
  {
    /** ID чата, где произошло событие. */
    chat_id: number;
    /** Пользователь, который отключил уведомления. */
    user: User;
    /** Unix-время, до наступления которого диалог был отключён. */
    muted_until: number;
    /** Текущий язык пользователя в формате IETF BCP 47. */
    user_locale?: UserLocale | null;
  }
>;

/** Update удаления диалога с ботом пользователем. */
export type DialogRemovedUpdate = MakeUpdate<
  'dialog_removed',
  {
    /** ID чата, где произошло событие. */
    chat_id: number;
    /** Пользователь, который удалил чат. */
    user: User;
    /** Текущий язык пользователя в формате IETF BCP 47. */
    user_locale?: UserLocale | null;
  }
>;

/** Update включения уведомлений в диалоге с ботом. */
export type DialogUnmutedUpdate = MakeUpdate<
  'dialog_unmuted',
  {
    /** ID чата, где произошло событие. */
    chat_id: number;
    /** Пользователь, который включил уведомления. */
    user: User;
    /** Текущий язык пользователя в формате IETF BCP 47. */
    user_locale?: UserLocale | null;
  }
>;

/** Update изменения названия группового чата. */
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

/**
 * @deprecated Отсутствует в схеме Bot API 0.0.33; оставлено для совместимости.
 */
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

/**
 * @deprecated Отсутствует в схеме Bot API 0.0.33; оставлено для совместимости.
 */
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

/**
 * @deprecated Не входит в discriminator `Update` схемы Bot API 0.0.33; оставлено для совместимости.
 */
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

/** Все update-типы, сохранённые в публичном union библиотеки. */
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
          : Type extends 'comment_created'
            ? CommentCreatedUpdate
            : Type extends 'comment_edited'
              ? CommentEditedUpdate
              : Type extends 'comment_removed'
                ? CommentRemovedUpdate
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
                          : Type extends 'bot_stopped'
                            ? BotStoppedUpdate
                            : Type extends 'dialog_cleared'
                              ? DialogClearedUpdate
                              : Type extends 'dialog_muted'
                                ? DialogMutedUpdate
                                : Type extends 'dialog_removed'
                                  ? DialogRemovedUpdate
                                  : Type extends 'dialog_unmuted'
                                    ? DialogUnmutedUpdate
                                    : Type extends 'chat_title_changed'
                                      ? ChatTitleChangedUpdate
                                      : Type extends 'message_construction_request'
                                        ? MessageConstructionRequestUpdate
                                        : Type extends 'message_constructed'
                                          ? MessageConstructedUpdate
                                          : Type extends 'message_chat_created'
                                            ? MessageChatCreatedUpdate
                                            : never;

/** Update Bot API, включая legacy-события для обратной совместимости. */
export type Update =
  | MessageCallbackUpdate
  | MessageCreatedUpdate
  | MessageRemovedUpdate
  | MessageEditedUpdate
  | CommentCreatedUpdate
  | CommentEditedUpdate
  | CommentRemovedUpdate
  | BotAddedUpdate
  | BotRemovedUpdate
  | UserAddedUpdate
  | UserRemovedUpdate
  | BotStartedUpdate
  | BotStoppedUpdate
  | DialogClearedUpdate
  | DialogMutedUpdate
  | DialogRemovedUpdate
  | DialogUnmutedUpdate
  | ChatTitleChangedUpdate
  | MessageConstructionRequestUpdate
  | MessageConstructedUpdate
  | MessageChatCreatedUpdate;

/** Подписка бота на доставку событий через WebHook. */
export type Subscription = {
  /** URL вебхука. */
  url: string;
  /** Unix-время, когда была создана подписка. */
  time: number;
  /** Типы updates, на которые подписан бот. */
  update_types: UpdateType[] | null;
  /** Версия модели данных подписки, если сервер вернул её в ответе. */
  version?: string | null;
};

/** Запрос на настройку доставки событий через WebHook. */
export type SubscriptionRequestBody = {
  /** URL HTTPS-endpoint вашего бота. Должен начинаться с `https://`. */
  url: string;
  /** Список уникальных типов updates, которые должен получать бот. */
  update_types?: UpdateType[] | null;
  /**
   * Секрет для заголовка `X-Max-Bot-Api-Secret` в каждом Webhook-запросе.
   * Ограничение API: от `5` до `256` символов; разрешены `A-Z`, `a-z`, `0-9`, `_` и `-`.
   */
  secret?: string | null;
};
