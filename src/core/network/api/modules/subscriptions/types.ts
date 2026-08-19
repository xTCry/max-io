import type { ReqOptions } from '../../client';
import type {
  ActionResponse,
  Subscription,
  SubscriptionRequestBody,
  Update,
} from '../../types';
import type { FlattenReq } from '../types';

/** DTO получения updates через long polling. Long polling и WebHook нельзя использовать одновременно. */
export type GetUpdatesDTO = {
  query: {
    /** Максимальное количество updates в ответе: от `1` до `100`, по умолчанию `100`. */
    limit?: number;
    /** Таймаут long polling в секундах: от `0` до `90`, по умолчанию `30`. */
    timeout?: number;
    /** Маркер, с которого нужно продолжить получение updates. Без него API возвращает только последнее update. */
    marker?: number;
    /** Типы updates через запятую для raw API. */
    types?: string;
  };
  /** Сигнал отмены активного long polling-запроса. */
  signal?: AbortSignal;
};

/** Параметры public API для long polling без raw-поля `types`. */
export type GetUpdatesExtra = Omit<FlattenReq<GetUpdatesDTO>, 'types'> &
  Pick<ReqOptions, 'signal'>;

/** Ответ long polling со следующей позицией marker. Для событий в чатах и каналах бот должен быть администратором. */
export type GetUpdatesResponse = {
  /** Полученные updates. */
  updates: Update[];
  /** Маркер для следующего запроса. */
  marker: number | null;
};

/** DTO получения списка WebHook-подписок текущего бота. */
export type GetSubscriptionsDTO = {};

/** Ответ со списком всех WebHook-подписок. */
export type GetSubscriptionsResponse = {
  /** Список текущих подписок. */
  subscriptions: Subscription[];
};

/** DTO настройки доставки событий текущего бота через WebHook. */
export type SubscribeDTO = {
  body: SubscriptionRequestBody;
};

/** Параметры public API для настройки WebHook-подписки. */
export type SubscribeExtra = SubscriptionRequestBody;

export type SubscribeResponse = ActionResponse;

/** DTO удаления WebHook-подписки. После удаления можно использовать long polling. */
export type UnsubscribeDTO = {
  query: {
    /** URL, который нужно удалить из подписок на WebHook. */
    url: string;
  };
};

export type UnsubscribeResponse = ActionResponse;
