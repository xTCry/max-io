import type { ReqOptions } from '../../client';
import type {
  ActionResponse,
  AttachmentRequest,
  Message,
  MessageLinkType,
  VideoAttachmentDetails,
} from '../../types';
import type { FlattenReq } from '../types';

/** DTO запроса сообщения или поста по ID. */
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
 * Для raw-запроса нужно указать один из параметров: `chat_id` или `message_ids`.
 */
export type GetMessagesDTO = {
  query: {
    /** ID чата. Обязательный параметр, если не указан `message_ids`. */
    chat_id?: number;
    /** Список ID сообщений через запятую. Обязательный параметр, если не указан `chat_id`. */
    message_ids?: string | null;
    /** Нижняя граница времени сообщений, Unix timestamp в миллисекундах. */
    from?: number;
    /** Верхняя граница времени сообщений, Unix timestamp в миллисекундах. */
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

/** DTO отправки сообщения в диалог, групповой чат или поста в канал. */
export type SendMessageDTO = {
  query: {
    /** Если нужно отправить сообщение пользователю, укажите его ID. */
    user_id?: number;
    /** Если сообщение отправляется в чат, укажите его ID. */
    chat_id?: number;
    /** Если `false`, сервер не будет генерировать предпросмотр ссылок в тексте сообщения. */
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
    /** Если `false`, участники чата не получат push-уведомления. Для каналов передавайте `true` или не указывайте поле. */
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

/** DTO удаления сообщения в диалоге, групповом чате или канале. */
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

/**
 * Ответ удаления сообщения.
 *
 * @remarks По схеме Bot API 0.0.33 бот должен быть администратором с правом удаления:
 * в канале и групповом чате можно удалить любое сообщение, в диалоге — только отправленное ботом.
 * Не отправляйте более двух запросов удаления в секунду для одного диалога, чата или канала.
 */
export type DeleteMessageResponse = ActionResponse;

/**
 * DTO редактирования сообщения.
 *
 * @remarks По схеме Bot API 0.0.33 сообщения в диалогах можно редактировать до 7 суток,
 * а сообщения с inline-кнопками, в групповых чатах и каналах — без ограничения срока.
 */
export type EditMessageDTO = {
  query: {
    /** ID редактируемого сообщения. */
    message_id: string;
  };
  body: SendMessageDTO['body'];
};

/** Параметры метода `api.editMessage` без `messageId`. */
export type EditMessageExtra = Omit<FlattenReq<EditMessageDTO>, 'message_id'>;

/**
 * Ответ редактирования сообщения.
 *
 * @remarks По схеме Bot API 0.0.33 сообщения в диалогах можно редактировать до 7 суток,
 * а сообщения с inline-кнопками, в групповых чатах и каналах — без ограничения срока.
 */
export type EditMessageResponse = ActionResponse;

/** DTO ответа после нажатия пользователем кнопки. */
export type AnswerOnCallbackDTO = {
  query: {
    /** ID callback-запроса из update `message_callback`: `updates[i].callback.callback_id`. */
    callback_id: string;
    /** Если `true`, сервер не будет генерировать предпросмотр ссылок в новом сообщении. */
    disable_link_preview?: boolean;
  };
  body: {
    /** Заполните это поле, если хотите изменить текущее сообщение. */
    message?: SendMessageDTO['body'] | null;
    /**
     * Однократное уведомление пользователю без редактирования callback-сообщения.
     */
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

/** DTO получения подробной информации о прикреплённом видео. */
export type GetVideoAttachmentDetailsDTO = {
  path: {
    /** Токен видео-вложения. */
    video_token: string;
  };
};

export type GetVideoAttachmentDetailsResponse = VideoAttachmentDetails;
