import type { Attachment } from './attachment';
import type { ChatType } from './chat';
import type { MarkupElement } from './markup';
import type { User } from './user';

/** Отправитель сообщения. */
export type MessageSender = User;

/** Получатель сообщения: чат, диалог или канал. */
export type MessageRecipient = {
  /** ID чата. */
  chat_id: number | null;
  /** Тип чата-получателя. */
  chat_type: ChatType;
};

/** Схема, представляющая тело сообщения. */
export type MessageBody = {
  /** Уникальный ID сообщения. */
  mid: string;
  /** ID последовательности сообщения в чате. */
  seq: number;
  /** Новый текст сообщения. Может быть `null`. */
  text: string | null;
  /** Вложения сообщения. Могут быть одним из типов `Attachment`. */
  attachments: Attachment[] | null;
  /** Разметка текста сообщения. */
  markup?: MarkupElement[] | null;
};

/** Тип связи сообщения с другим сообщением. */
export type MessageLinkType = 'forward' | 'reply';

/** Пересланное или ответное сообщение. */
export type LinkedMessage = {
  /** Тип связи. */
  type: MessageLinkType;
  /** Отправитель связанного сообщения. */
  sender?: MessageSender | null;
  /** ID чата связанного сообщения. */
  chat_id?: number;
  /** Тело связанного сообщения. */
  message: MessageBody;
};

/** Статистика сообщения. Возвращается только для постов в каналах. */
export type MessageStat = {
  /** Количество пользователей, которые увидели пост в канале. */
  views: number;
};

/** Пользователь, от имени которого клиент сконструировал сообщение. */
export type MessageConstructor = User;

/** Сообщение в чате. */
export type Message = {
  /** Пользователь, отправивший сообщение. */
  sender?: MessageSender | null;
  /** Получатель сообщения. Может быть пользователем или чатом. */
  recipient: MessageRecipient;
  /** Время создания сообщения в формате Unix-time. */
  timestamp: number;
  /** Пересланное или ответное сообщение. */
  link?: LinkedMessage | null;
  /** Содержимое сообщения: текст и вложения. Может быть `null`, если сообщение содержит только пересланное сообщение. */
  body: MessageBody;
  /** Статистика сообщения. Возвращается только для постов в каналах. */
  stat?: MessageStat | null;
  /** Публичная ссылка на пост в канале. Отсутствует для диалогов и групповых чатов. */
  url?: string | null;
  /** Пользователь, сконструировавший сообщение через inline-сценарий. */
  constructor?: MessageConstructor | null;
};

/** Сообщение, подготовленное клиентом в сценарии message construction. */
export type ConstructedMessage = Pick<
  Message,
  'sender' | 'timestamp' | 'link' | 'body'
>;
