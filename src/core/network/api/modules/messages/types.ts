import type { ReqOptions } from '../../client';
import type {
  ActionResponse,
  AttachmentRequest,
  Message,
  MessageLinkType,
} from '../../types';
import type { FlattenReq } from '../types';

/** DTO запроса сообщения по ID. */
export type GetMessageDTO = {
  path: {
    /** ID сообщения. */
    message_id: string;
  };
};

export type GetMessageResponse = Message;

/** DTO запроса списка сообщений. */
export type GetMessagesDTO = {
  query: {
    /** ID чата для фильтрации сообщений. */
    chat_id?: number;
    /** ID сообщений через запятую для raw API. */
    message_ids?: string | null;
    /** Нижняя граница времени создания сообщения, Unix timestamp в миллисекундах. */
    from?: number;
    /** Верхняя граница времени создания сообщения, Unix timestamp в миллисекундах. */
    to?: number;
    /** Максимальное количество сообщений в ответе. */
    count?: number;
  };
};

/** Параметры метода `api.getMessages` без `chatId`. */
export type GetMessagesExtra = Omit<
  FlattenReq<GetMessagesDTO>,
  'chat_id' | 'message_ids'
> & {
  /** ID сообщений для фильтрации ответа. */
  message_ids?: string[];
};

/** Ответ со списком сообщений. */
export type GetMessagesResponse = {
  /** Сообщения, подходящие под фильтр. */
  messages: Message[];
};

/** DTO отправки сообщения. */
export type SendMessageDTO = {
  query: {
    /** ID пользователя для отправки в диалог. */
    user_id?: number;
    /** ID чата для отправки в чат или канал. */
    chat_id?: number;
    /** Отключить предпросмотр ссылок. */
    disable_link_preview?: boolean;
  };
  body: {
    /** Текст сообщения. */
    text?: string | null;
    /** Вложения сообщения. */
    attachments?: AttachmentRequest[] | null;
    /** Связь с другим сообщением: ответ или пересылка. */
    link?: { type: MessageLinkType; mid: string } | null;
    /** Нужно ли отправлять push-уведомление. */
    notify?: boolean;
    /** Формат текста сообщения. */
    format?: 'markdown' | 'html' | null;
  };
  /** Сигнал отмены HTTP-запроса и внутренних повторов. */
  signal?: AbortSignal;
};

/** Дополнительные параметры отправки сообщения через public API. */
export type SendMessageExtra = Omit<
  FlattenReq<SendMessageDTO>,
  'chat_id' | 'user_id' | 'text'
> &
  Pick<ReqOptions, 'signal'>;

export type SendMessageResponse = {
  /** Созданное сообщение. */
  message: Message;
};

/** DTO удаления сообщения. */
export type DeleteMessageDTO = {
  query: {
    /** ID сообщения. */
    message_id: string;
  };
};

/** Параметры метода `api.deleteMessage` без `messageId`. */
export type DeleteMessageExtra = Omit<
  FlattenReq<DeleteMessageDTO>,
  'message_id'
>;

export type DeleteMessageResponse = ActionResponse;

/** DTO редактирования сообщения. */
export type EditMessageDTO = {
  query: {
    /** ID редактируемого сообщения. */
    message_id: string;
  };
  body: SendMessageDTO['body'];
};

/** Параметры метода `api.editMessage` без `messageId`. */
export type EditMessageExtra = Omit<FlattenReq<EditMessageDTO>, 'message_id'>;

export type EditMessageResponse = ActionResponse;

/** DTO ответа на callback-кнопку. */
export type AnswerOnCallbackDTO = {
  query: {
    /** ID callback, полученный в update `message_callback`. */
    callback_id: string;
  };
  body: {
    /** Сообщение для изменения текущего сообщения с кнопкой. */
    message?: SendMessageDTO['body'] | null;
    /** Одноразовое уведомление пользователю. */
    notification?: string | null;
  };
};

/** Параметры метода `api.answerOnCallback` без `callbackId`. */
export type AnswerOnCallbackExtra = Omit<
  FlattenReq<AnswerOnCallbackDTO>,
  'callback_id'
>;

export type AnswerOnCallbackResponse = ActionResponse;
