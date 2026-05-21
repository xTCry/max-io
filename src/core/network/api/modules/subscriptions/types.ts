import type {
  ActionResponse,
  Subscription,
  SubscriptionRequestBody,
  Update,
} from '../../types';

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
  marker: number | null;
};

/** DTO получения списка WebHook-подписок. */
export type GetSubscriptionsDTO = {};

/** Ответ со списком всех WebHook-подписок. */
export type GetSubscriptionsResponse = {
  /** Список текущих подписок. */
  subscriptions: Subscription[];
};

/** DTO настройки доставки событий бота через WebHook. */
export type SubscribeDTO = {
  body: SubscriptionRequestBody;
};

export type SubscribeExtra = SubscriptionRequestBody;

export type SubscribeResponse = ActionResponse;

/** DTO удаления WebHook-подписки. */
export type UnsubscribeDTO = {
  query: {
    /** URL, который нужно удалить из подписок на WebHook. */
    url: string;
  };
};

export type UnsubscribeResponse = ActionResponse;
