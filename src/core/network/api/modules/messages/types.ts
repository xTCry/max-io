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
    /** ID сообщения (`mid`), чтобы получить одно сообщение в чате. */
    message_id: string;
  };
};

/** Ответ с сообщением по ID. */
export type GetMessageResponse = Message;

/**
 * DTO запроса информации о сообщении или массива сообщений из чата.
 * Для выполнения raw-запроса нужно указать один из параметров: `chat_id` или `message_ids`.
 */
export type GetMessagesDTO = {
  query: {
    /** ID чата. Обязательный параметр, если не указан `message_ids`. */
    chat_id?: number;
    /** Список ID сообщений через запятую. Обязательный параметр, если не указан `chat_id`. */
    message_ids?: string | null;
    /** Время начала для запрашиваемых сообщений, Unix timestamp. */
    from?: number;
    /** Время окончания для запрашиваемых сообщений, Unix timestamp. */
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
  /** Массив сообщений. При запросе по `chat_id` сообщения возвращаются в обратном порядке: последние первыми. */
  messages: Message[];
};

/** DTO отправки сообщения в чат или диалог. */
export type SendMessageDTO = {
  query: {
    /** Если нужно отправить сообщение пользователю, укажите его ID. */
    user_id?: number;
    /** Если сообщение отправляется в чат, укажите его ID. */
    chat_id?: number;
    /** Если `false`, сервер не будет генерировать превью для ссылок в тексте сообщения. */
    disable_link_preview?: boolean;
  };
  body: {
    /** Новый текст сообщения. Ограничение API: до `4000` символов. */
    text?: string | null;
    /**
     * Вложения сообщения.
     * При редактировании `null` не изменяет текущие вложения, пустой массив удаляет все вложения.
     */
    attachments?: AttachmentRequest[] | null;
    /** Ссылка на сообщение: ответ или пересылка. */
    link?: { type: MessageLinkType; mid: string } | null;
    /** Если `false`, участники чата не будут уведомлены. По умолчанию `true`. */
    notify?: boolean;
    /** Формат текста сообщения: `markdown` или `html`. */
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

/** Ответ с созданным сообщением. */
export type SendMessageResponse = {
  /** Созданное сообщение. */
  message: Message;
};

/** DTO удаления сообщения в диалоге или чате. */
export type DeleteMessageDTO = {
  query: {
    /** ID удаляемого сообщения. */
    message_id: string;
  };
};

/** Параметры метода `api.deleteMessage` без `messageId`. */
export type DeleteMessageExtra = Omit<
  FlattenReq<DeleteMessageDTO>,
  'message_id'
>;

/** Ответ удаления сообщения. По схеме метод удаляет сообщения, отправленные менее 24 часов назад. */
export type DeleteMessageResponse = ActionResponse;

/** DTO редактирования сообщения в чате. */
export type EditMessageDTO = {
  query: {
    /** ID редактируемого сообщения. */
    message_id: string;
  };
  body: SendMessageDTO['body'];
};

/** Параметры метода `api.editMessage` без `messageId`. */
export type EditMessageExtra = Omit<FlattenReq<EditMessageDTO>, 'message_id'>;

/** Ответ редактирования сообщения. По схеме метод редактирует сообщения, отправленные менее 24 часов назад. */
export type EditMessageResponse = ActionResponse;

/** DTO ответа после нажатия пользователем кнопки. */
export type AnswerOnCallbackDTO = {
  query: {
    /** Идентификатор кнопки из update `message_callback`: `updates[i].callback.callback_id`. */
    callback_id: string;
  };
  body: {
    /** Заполните это поле, если хотите изменить текущее сообщение. */
    message?: SendMessageDTO['body'] | null;
    /** Заполните это поле, если хотите отправить одноразовое уведомление пользователю. */
    notification?: string | null;
  };
};

/** Параметры метода `api.answerOnCallback` без `callbackId`. */
export type AnswerOnCallbackExtra = Omit<
  FlattenReq<AnswerOnCallbackDTO>,
  'callback_id'
>;

/** Ответ на callback-кнопку. */
export type AnswerOnCallbackResponse = ActionResponse;
