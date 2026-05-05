import type { NullableObject } from '../../../helpers/types';
import type { Button } from './keyboard';

type MediaAttachmentRequestPayload = {
  /** Токен файла, полученный после загрузки через upload API. */
  token?: string;
};

/** Запрос на прикрепление изображения к исходящему сообщению. */
export type ImageAttachmentRequest = {
  type: 'image';
  payload: MediaAttachmentRequestPayload & {
    /** URL изображения. Взаимоисключается с `token` и `photos`. */
    url?: string | null;
    /** Набор токенов изображений. Взаимоисключается с `url` и `token`. */
    photos?: {
      [key: string]: { token: string };
    } | null;
  };
};

/** Запрос на прикрепление видео к исходящему сообщению. */
export type VideoAttachmentRequest = {
  type: 'video';
  payload: MediaAttachmentRequestPayload;
};

/** Запрос на прикрепление аудио к исходящему сообщению. */
export type AudioAttachmentRequest = {
  type: 'audio';
  payload: MediaAttachmentRequestPayload;
};

/** Запрос на прикрепление файла к исходящему сообщению. */
export type FileAttachmentRequest = {
  type: 'file';
  payload: MediaAttachmentRequestPayload;
};

/** Запрос на прикрепление контакта к исходящему сообщению. */
export type ContactAttachmentRequest = {
  type: 'contact';
  payload: {
    /** Имя контакта. */
    name: string | null;
    /** ID пользователя Max, если контакт связан с аккаунтом. */
    contact_id?: number | null;
    /** Контакт в формате vCard. */
    vcf_info?: string | null;
    /** Телефон для генерации vCard. */
    vcf_phone?: string | null;
  };
};

/** Запрос на прикрепление стикера к исходящему сообщению. */
export type StickerAttachmentRequest = {
  type: 'sticker';
  payload: {
    /** Код стикера. */
    code: string;
  };
};

/** Запрос на прикрепление inline keyboard к исходящему сообщению. */
export type InlineKeyboardAttachmentRequest = {
  type: 'inline_keyboard';
  payload: {
    /** Двумерный массив кнопок: строки и кнопки внутри строки. */
    buttons: Button[][];
  };
};

/** Запрос на прикрепление геолокации к исходящему сообщению. */
export type LocationAttachmentRequest = {
  type: 'location';
  /** Широта. */
  latitude: number;
  /** Долгота. */
  longitude: number;
};

/** Запрос на прикрепление предпросмотра ссылки к исходящему сообщению. */
export type ShareAttachmentRequest = {
  type: 'share';
  payload: Partial<
    NullableObject<MediaAttachmentRequestPayload> & {
      url?: string | null;
    }
  >;
};

/** Payload изображения для изменения иконки чата или бота. */
export type PhotoAttachmentRequestPayload = {
  /** URL изображения. Взаимоисключается с `token` и `photos`. */
  url?: string | null;
  /** Токен изображения. Взаимоисключается с `url` и `photos`. */
  token?: string | null;
  /** Набор токенов изображений. Взаимоисключается с `url` и `token`. */
  photos?: Record<string, string> | null;
};

/** Вложение, которое можно передать при отправке или редактировании сообщения. */
export type AttachmentRequest =
  | ImageAttachmentRequest
  | VideoAttachmentRequest
  | AudioAttachmentRequest
  | FileAttachmentRequest
  | StickerAttachmentRequest
  | ContactAttachmentRequest
  | InlineKeyboardAttachmentRequest
  | ShareAttachmentRequest
  | LocationAttachmentRequest;

/** Тип исходящего вложения. */
export type AttachmentType = AttachmentRequest['type'];
