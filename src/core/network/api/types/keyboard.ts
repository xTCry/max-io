export type ButtonIntent = 'default' | 'positive' | 'negative';

/** Callback-кнопка для update `message_callback`. */
export type CallbackButton = {
  type: 'callback';
  /** Видимый текст кнопки. */
  text: string;
  /** Payload, который придёт в callback update. */
  payload: string;
  /** @deprecated Отключено на клиенте */
  intent?: ButtonIntent;
};

/** Кнопка-ссылка. */
export type LinkButton = {
  type: 'link';
  /** Видимый текст кнопки. */
  text: string;
  /** Ссылка для открытия. */
  url: string;
};

/** Кнопка запроса контакта. */
export type RequestContactButton = {
  type: 'request_contact';
  /** Видимый текст кнопки. */
  text: string;
};

/** Кнопка запроса геолокации. */
export type RequestGeoLocationButton = {
  type: 'request_geo_location';
  /** Видимый текст кнопки. */
  text: string;
  /** Быстрая отправка геолокации без дополнительного подтверждения. */
  quick?: boolean;
};

/** Кнопка запуска мини-приложения. */
export type OpenAppButton = {
  type: 'open_app';
  /** Видимый текст кнопки. */
  text: string;
  /** Username бота или ссылка на него. */
  web_app?: string | null;
  /** Параметр запуска мини-приложения. */
  payload?: string | null;
  /** Идентификатор бота с мини-приложением. */
  contact_id?: number | null;
};

/** Кнопка, отправляющая свой текст в чат. */
export type MessageButton = {
  type: 'message';
  /** Видимый текст кнопки и текст отправляемого сообщения. */
  text: string;
};

/** Кнопка копирования текста в буфер обмена. */
export type ClipboardButton = {
  type: 'clipboard';
  /** Видимый текст кнопки. */
  text: string;
  /** Текст для копирования в буфер обмена. */
  payload: string;
};

/**
 * @deprecated Серверный API больше не поддерживает кнопку `chat`.
 * Оставлено только для совместимости со старым кодом.
 */
export type ChatButton = {
  type: 'chat';
  text: string;
  chat_title: string;
  chat_description?: string | null;
  start_payload?: string | null;
  uuid?: string | null;
};

/** Поддерживаемые типы кнопок для inline keyboard. */
export type Button =
  | CallbackButton
  | LinkButton
  | RequestContactButton
  | RequestGeoLocationButton
  | OpenAppButton
  | MessageButton
  | ClipboardButton;
