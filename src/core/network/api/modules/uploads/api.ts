import { BaseApi } from '../../base-api';
import type { FlattenReq } from '../types';
import type { GetUploadUrlDTO } from './types';

export class UploadsApi extends BaseApi {
  /** Возвращает endpoint для загрузки бинарного вложения указанного типа. */
  getUploadUrl = async ({ ...query }: FlattenReq<GetUploadUrlDTO>) => {
    return this._post('uploads', { query });
  };
}
