import { BaseApi } from '../../base-api';
import type { FlattenReq } from '../types';
import type { EditMyCommandsDTO, EditMyInfoDTO } from './types';

export class BotsApi extends BaseApi {
  /** Возвращает профиль бота, определённого текущим access token. */
  getMyInfo = async () => {
    return this._get('me', {});
  };

  /** Частично обновляет профиль текущего бота. */
  editMyInfo = async ({ ...body }: FlattenReq<EditMyInfoDTO>) => {
    return this._patch('me', { body });
  };

  /** Полностью заменяет список команд текущего бота. */
  editMyCommands = async ({ ...body }: FlattenReq<EditMyCommandsDTO>) => {
    return this._patch('me/commands', { body });
  };
}
