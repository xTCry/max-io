import type { UploadType } from '../../types';

/** DTO запроса URL для загрузки файла. */
export type GetUploadUrlDTO = {
  query: {
    /** Тип загружаемого файла. */
    type: UploadType;
  };
};

/** URL и токен, которые используются для загрузки файла и дальнейшей отправки вложения. */
export type GetUploadUrlResponse = {
  /** URL, на который нужно загрузить бинарные данные. */
  url: string;
  /** Токен для аудио и видео, если сервер вернул его сразу с upload URL. */
  token?: string;
};
