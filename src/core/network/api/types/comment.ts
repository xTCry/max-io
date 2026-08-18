import type { MarkupElement } from './markup';
import type { MessageRecipient, MessageSender } from './message';

/** Тело комментария к посту в канале. */
export type CommentMessageBody = {
  /** Уникальный ID комментария (`mid`). */
  mid: string;
  /** Порядковый номер комментария под постом. */
  seq: number;
  /** Текст комментария. Может быть `null`. */
  text: string | null;
  /** Разметка текста комментария. Ссылки и упоминания пользователей не поддерживаются. */
  markup?: MarkupElement[] | null;
};

/** Связанный комментарий, на который получен ответ. */
export type CommentLinkedMessage = {
  /** Для комментариев API поддерживает только ответ на другой комментарий. */
  type: 'reply';
  /** Отправитель связанного комментария. */
  sender?: MessageSender | null;
  /** ID исходного канала, если сервер его вернул. */
  chat_id?: number;
  /** Тело связанного комментария. */
  message: CommentMessageBody;
};

/** Комментарий к посту в канале. */
export type CommentMessage = {
  /** Отправитель комментария. Может быть `null`, если комментарий опубликован от имени канала. */
  sender?: MessageSender | null;
  /** Получатель комментария: канал с постом. */
  recipient: MessageRecipient;
  /** Время создания комментария, Unix timestamp в миллисекундах. */
  timestamp: number;
  /** Комментарий, на который получен ответ. */
  link?: CommentLinkedMessage | null;
  /** Текст и разметка комментария. */
  body: CommentMessageBody;
};
