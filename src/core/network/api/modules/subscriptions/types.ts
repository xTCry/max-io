import type { Update } from '../../types';

/** DTO получения updates через long polling. */
export type GetUpdatesDTO = {
  query: {
    /** Максимальное количество updates в ответе. */
    limit?: number;
    /** Таймаут long polling в секундах. */
    timeout?: number;
    /** Маркер, с которого нужно продолжить получение updates. */
    marker?: number;
    /** Типы updates через запятую для raw API. */
    types?: string;
  };
};

/** Ответ long polling со следующей позицией маркера. */
export type GetUpdatesResponse = {
  /** Полученные updates. */
  updates: Update[];
  /** Маркер для следующего запроса. */
  marker: number;
};
