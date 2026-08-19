import type { Attachment } from './attachment';
import type { ChatType } from './chat';
import type { MarkupElement } from './markup';
import type { User } from './user';

/** Отправитель сообщения. */
export type MessageSender = User;

/** Получатель сообщения: пользователь в диалоге, групповой чат или канал. */
export type MessageRecipient = {
  /** ID чата или канала. */
  chat_id: number | null;
  /** Тип чата-получателя. */
  chat_type: ChatType;
  /** ID пользователя или бота в диалоге; для чата и канала равно `null`. */
  user_id: number | null;
  /** ID поста канала, к которому оставлен комментарий; иначе `null`. */
  post_id?: string | null;
};

/** Схема, представляющая тело сообщения. */
export type MessageBody = {
  /** Уникальный ID сообщения. */
  mid: string;
  /** ID последовательности сообщения в чате. */
  seq: number;
  /** Новый текст сообщения. Может быть `null`. */
  text: string | null;
  /** Вложения одного из типов `Attachment`. */
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
  /** Количество пользователей, увидевших пост или репост в области видимости экрана. */
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
  /** Содержимое сообщения: текст и вложения; в отдельных ответах API может отсутствовать для сообщения только с пересылкой. */
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
