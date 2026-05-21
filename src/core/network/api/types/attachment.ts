import type { NullableObject } from '../../../helpers/types';
import type { Button, ReplyButton } from './keyboard';
import type { User } from './user';

type MediaPayload = {
  /** URL загруженного медиафайла. */
  url: string;
  /** Токен загруженного медиафайла для повторного использования в API. */
  token: string;
};

/** Вложение изображения в полученном сообщении. */
export type PhotoAttachment = {
  type: 'image';
  payload: MediaPayload & {
    /** ID фотографии на стороне Max. */
    photo_id: number;
  };
};

/** Вложение видео в полученном сообщении. */
export type VideoAttachment = {
  type: 'video';
  payload: MediaPayload;
  /** URL превью видео. */
  thumbnail?: string | null;
  /** Ширина видео в пикселях. */
  width?: number | null;
  /** Высота видео в пикселях. */
  height?: number | null;
  /** Длительность видео. */
  duration?: number | null;
};

/** URL-адреса воспроизведения видео в разных качествах. */
export type VideoUrls = {
  /** MP4 1080p, если доступно. */
  mp4_1080?: string | null;
  /** MP4 720p, если доступно. */
  mp4_720?: string | null;
  /** MP4 480p, если доступно. */
  mp4_480?: string | null;
  /** MP4 360p, если доступно. */
  mp4_360?: string | null;
  /** MP4 240p, если доступно. */
  mp4_240?: string | null;
  /** MP4 144p, если доступно. */
  mp4_144?: string | null;
  /** HLS-трансляция, если доступна. */
  hls?: string | null;
};

/** Превью прикреплённого видео. */
export type VideoThumbnail = {
  /** URL изображения. */
  url: string;
};

/** Подробная информация о прикреплённом видео. */
export type VideoAttachmentDetails = {
  /** Токен видео-вложения. */
  token: string;
  /** URL-адреса воспроизведения и HLS, если доступны. */
  urls: VideoUrls;
  /** Превью видео. */
  thumbnail?: VideoThumbnail | null;
  /** Ширина видео в пикселях. */
  width?: number | null;
  /** Высота видео в пикселях. */
  height?: number | null;
  /** Длительность видео. */
  duration?: number | null;
};

/** Вложение аудио в полученном сообщении. */
export type AudioAttachment = {
  type: 'audio';
  payload: MediaPayload;
  /** Аудио-транскрипция, если сервер её вернул. */
  transcription?: string | null;
};

/** Вложение файла в полученном сообщении. */
export type FileAttachment = {
  type: 'file';
  payload: MediaPayload;
  /** Имя файла. */
  filename: string;
  /** Размер файла в байтах. */
  size: number;
};

/** Стикер в полученном сообщении. */
export type StickerAttachment = {
  type: 'sticker';
  payload: {
    /** URL изображения стикера. */
    url: string;
    /** Код стикера. */
    code: string;
  };
  /** Ширина стикера в пикселях. */
  width: number;
  /** Высота стикера в пикселях. */
  height: number;
};

/** Контакт, отправленный пользователем. */
export type ContactAttachment = {
  type: 'contact';
  payload: {
    /** Контакт в формате vCard. */
    vcf_info?: string | null;
    /** Хеш vCard для проверки номера, привязанного к аккаунту Max. */
    hash?: string | null;
    /** Пользователь Max, если контакт связан с аккаунтом. */
    max_info?: User | null;
  };
};

/** Вложение предпросмотра ссылки. */
export type ShareAttachment = {
  type: 'share';
  payload: Partial<NullableObject<MediaPayload>>;
  /** Заголовок предпросмотра. */
  title?: string | null;
  /** Описание предпросмотра. */
  description?: string | null;
  /** URL изображения предпросмотра. */
  image_url?: string | null;
};

/** Геолокация, отправленная пользователем. */
export type LocationAttachment = {
  type: 'location';
  /** Широта. */
  latitude: number;
  /** Долгота. */
  longitude: number;
};

/** Inline keyboard в полученном сообщении. */
export type InlineKeyboardAttachment = {
  type: 'inline_keyboard';
  payload: {
    /** Двумерный массив кнопок: строки и кнопки внутри строки. */
    buttons: Button[][];
  };
};

/** Reply keyboard в полученном сообщении. */
export type ReplyKeyboardAttachment = {
  type: 'reply_keyboard';
  /** Двумерный массив кнопок: строки и кнопки внутри строки. */
  buttons: ReplyButton[][];
};

/** Вложение с payload, отправленным через кнопку reply keyboard типа `message`. */
export type DataAttachment = {
  type: 'data';
  data: string;
};

/** Вложение полученного сообщения. */
export type Attachment =
  | PhotoAttachment
  | VideoAttachment
  | AudioAttachment
  | FileAttachment
  | StickerAttachment
  | ContactAttachment
  | InlineKeyboardAttachment
  | ReplyKeyboardAttachment
  | DataAttachment
  | ShareAttachment
  | LocationAttachment;
