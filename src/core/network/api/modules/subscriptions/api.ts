import { BaseApi } from '../../base-api';
import type { FlattenReq } from '../types';
import type { GetUpdatesDTO, SubscribeDTO, UnsubscribeDTO } from './types';

export class SubscriptionsApi extends BaseApi {
  getUpdates = async ({ ...query }: FlattenReq<GetUpdatesDTO>) => {
    return this._get('updates', { query });
  };

  getSubscriptions = async () => {
    return this._get('subscriptions', {});
  };

  subscribe = async ({ ...body }: FlattenReq<SubscribeDTO>) => {
    return this._post('subscriptions', { body });
  };

  unsubscribe = async ({ ...query }: FlattenReq<UnsubscribeDTO>) => {
    return this._delete('subscriptions', { query });
  };
}
