import type {
  Button,
  CallbackButton,
  ChatButton,
  ClipboardButton,
  LinkButton,
  MessageButton,
  OpenAppButton,
  RequestContactButton,
  RequestGeoLocationButton,
} from '../network/api';

type MakeExtra<
  T extends Button | ChatButton,
  O extends keyof Omit<T, 'text' | 'type'> | '' = '',
> = Omit<T, 'text' | 'type' | O>;

/**
 * Создаёт callback-кнопку.
 * При нажатии сервер Max отправляет update `message_callback`.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 * @param payload Полезная нагрузка кнопки.
 * Будет доступна в callback update. Ограничение: до `1024` символов.
 * @param extra Дополнительные параметры кнопки.
 */
export const callback = (
  text: string,
  payload: string,
  extra?: MakeExtra<CallbackButton, 'payload'>,
): CallbackButton => {
  return { type: 'callback', text, payload, ...extra };
};

/**
 * Создаёт кнопку-ссылку.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 * @param url Ссылка, которая будет открыта пользователю.
 * Ограничение: до `2048` символов.
 */
export const link = (text: string, url: string): LinkButton => {
  return { type: 'link', text, url };
};

/**
 * Создаёт кнопку запроса контакта.
 * При нажатии пользователю будет предложено отправить контакт.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 */
export const requestContact = (text: string): RequestContactButton => {
  return { type: 'request_contact', text };
};

/**
 * Создаёт кнопку запроса геолокации.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 * @param extra Дополнительные параметры.
 * Если `quick: true`, клиент может отправить геолокацию без дополнительного подтверждения.
 */
export const requestGeoLocation = (
  text: string,
  extra?: MakeExtra<RequestGeoLocationButton>,
): RequestGeoLocationButton => {
  return { type: 'request_geo_location', text, ...extra };
};

/**
 * Создаёт кнопку запуска мини-приложения.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 * @param webApp Публичное имя (`username`) бота или ссылка на него,
 * чьё мини-приложение нужно открыть.
 * @param payload Параметр запуска мини-приложения.
 * Будет передан в `initData`.
 * @param contactId Идентификатор бота, чьё мини-приложение нужно открыть.
 */
export const openApp = (
  text: string,
  webApp: string,
  payload?: string | null,
  contactId?: number | null,
): OpenAppButton => {
  return {
    type: 'open_app',
    text,
    web_app: webApp,
    payload,
    contact_id: contactId,
  };
};

/**
 * Создаёт кнопку, которая отправляет свой текст в чат от лица пользователя.
 *
 * @param text Текст кнопки.
 * Этот же текст будет отправлен сообщением при нажатии.
 */
export const message = (text: string): MessageButton => {
  return { type: 'message', text };
};

/**
 * Создаёт кнопку копирования в буфер обмена.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 * @param payload Текст, который будет скопирован в буфер обмена.
 */
export const clipboard = (text: string, payload: string): ClipboardButton => {
  return { type: 'clipboard', text, payload };
};

/**
 * @deprecated Серверный API больше не поддерживает кнопку `chat`.
 * Оставлено только для совместимости со старым кодом.
 *
 * @param text Видимый текст кнопки. От `1` до `128` символов.
 * @param chatTitle Заголовок создаваемого чата.
 * @param extra Дополнительные legacy-поля старого контракта.
 */
export const chat = (
  text: string,
  chatTitle: string,
  extra?: MakeExtra<ChatButton, 'chat_title'>,
): ChatButton => {
  return { type: 'chat', text, chat_title: chatTitle, ...extra };
};
