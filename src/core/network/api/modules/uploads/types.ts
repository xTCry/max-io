import type { UploadType } from '../../types';

/** DTO запроса upload endpoint для передачи бинарного файла. */
export type GetUploadUrlDTO = {
  query: {
    /** Тип загружаемого файла. */
    type: UploadType;
  };
};

/** Upload endpoint и токен для последующей отправки вложения. */
export type GetUploadUrlResponse = {
  /** URL, на который нужно передать бинарные данные. Срок действия URL не ограничен по схеме API. */
  url: string;
  /** Токен для добавления медиа во вложение сообщения, если сервер вернул его сразу. */
  token?: string;
};
