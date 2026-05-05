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

/** Тело сообщения с текстом, вложениями и разметкой. */
export type MessageBody = {
  /** ID сообщения. */
  mid: string;
  /** Порядковый номер сообщения в чате. */
  seq: number;
  /** Текст сообщения. Может быть `null`, если сообщение состоит только из вложений. */
  text: string | null;
  /** Вложения сообщения. */
  attachments: Attachment[] | null;
  /** Разметка текста сообщения, если сервер её вернул. */
  markup?: MarkupElement[] | null;
};

/** Тип связи сообщения с другим сообщением. */
export type MessageLinkType = 'forward' | 'reply';

/** Связанное сообщение: пересылка или ответ. */
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

/** Статистика сообщения. Обычно возвращается для постов в каналах. */
export type MessageStat = {
  /** Количество просмотров. */
  views: number;
};

/** Пользователь, от имени которого клиент сконструировал сообщение. */
export type MessageConstructor = User;

/** Сообщение Max. */
export type Message = {
  /** Отправитель сообщения. */
  sender?: MessageSender | null;
  /** Получатель сообщения. */
  recipient: MessageRecipient;
  /** Время создания сообщения, Unix timestamp в миллисекундах. */
  timestamp: number;
  /** Связанное сообщение, если это ответ или пересылка. */
  link?: LinkedMessage | null;
  /** Тело сообщения. */
  body: MessageBody;
  /** Статистика сообщения, если доступна. */
  stat?: MessageStat | null;
  /** Публичная ссылка на сообщение, если доступна. */
  url?: string | null;
  /** Пользователь, сконструировавший сообщение через inline-сценарий. */
  constructor?: MessageConstructor | null;
};

/** Сообщение, подготовленное клиентом в сценарии message construction. */
export type ConstructedMessage = Pick<
  Message,
  'sender' | 'timestamp' | 'link' | 'body'
>;
