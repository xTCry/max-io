import { BaseApi } from '../../base-api';
import type { FlattenReq } from '../types';
import type { EditMyCommandsDTO, EditMyInfoDTO } from './types';

export class BotsApi extends BaseApi {
  getMyInfo = async () => {
    return this._get('me', {});
  };

  editMyInfo = async ({ ...body }: FlattenReq<EditMyInfoDTO>) => {
    return this._patch('me', { body });
  };

  editMyCommands = async ({ ...body }: FlattenReq<EditMyCommandsDTO>) => {
    return this._patch('me/commands', { body });
  };
}
