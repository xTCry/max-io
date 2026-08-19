import { BaseApi } from '../../base-api';
import type { ReqOptions } from '../../client';
import type { FlattenReq } from '../types';
import type { GetUpdatesDTO, SubscribeDTO, UnsubscribeDTO } from './types';

export class SubscriptionsApi extends BaseApi {
  /** Получает updates через long polling. Нельзя использовать одновременно с WebHook. */
  getUpdates = async ({
    signal,
    ...query
  }: FlattenReq<GetUpdatesDTO> & Pick<ReqOptions, 'signal'>) => {
    return this._get('updates', { query, signal });
  };

  /** Возвращает все WebHook-подписки текущего бота. */
  getSubscriptions = async () => {
    return this._get('subscriptions', {});
  };

  /** Создаёт или обновляет WebHook-подписку текущего бота. */
  subscribe = async ({ ...body }: FlattenReq<SubscribeDTO>) => {
    return this._post('subscriptions', { body });
  };

  /** Удаляет WebHook-подписку по URL. */
  unsubscribe = async ({ ...query }: FlattenReq<UnsubscribeDTO>) => {
    return this._delete('subscriptions', { query });
  };
}
