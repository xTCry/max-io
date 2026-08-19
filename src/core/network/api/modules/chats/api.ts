import { BaseApi } from '../../base-api';
import type { FlattenReq } from '../types';
import type {
  AddChatMembersDTO,
  AddChatMembersResponse,
  DeleteChatAdminDTO,
  DeleteChatAdminResponse,
  DeleteChatDTO,
  DeleteChatResponse,
  EditChatInfoDTO,
  EditChatInfoResponse,
  GetAllChatsDTO,
  GetAllChatsResponse,
  GetChatAdminsDTO,
  GetChatAdminsResponse,
  GetChatByIdDTO,
  GetChatByIdResponse,
  GetChatByLinkDTO,
  GetChatByLinkResponse,
  GetChatMembersDTO,
  GetChatMembershipDTO,
  GetChatMembershipResponse,
  GetChatMembersResponse,
  GetPinnedMessageDTO,
  GetPinnedMessageResponse,
  LeaveChatDTO,
  LeaveChatResponse,
  PinMessageDTO,
  PinMessageResponse,
  RemoveChatMemberDTO,
  RemoveChatMemberResponse,
  SendActionDTO,
  SendActionResponse,
  SetChatAdminsDTO,
  SetChatAdminsResponse,
  UnpinMessageDTO,
  UnpinMessageResponse,
} from './types';

export class ChatsApi extends BaseApi {
  /** @deprecated С июня 2026 API не поддерживает `GET /chats`; сохраняйте `chat_id` из updates. */
  async getAll({
    ...query
  }: FlattenReq<GetAllChatsDTO>): Promise<GetAllChatsResponse> {
    return this._get('chats', {
      query,
    });
  }

  /** Возвращает информацию о групповом чате или канале по ID. */
  async getById({
    chat_id,
  }: FlattenReq<GetChatByIdDTO>): Promise<GetChatByIdResponse> {
    return this._get('chats/{chat_id}', {
      path: { chat_id },
    });
  }

  /**
   * @deprecated Endpoint отсутствует в схеме Bot API 0.0.33 от 18 августа 2026 года.
   * Ручная проверка `GET /chats/max_news` на основном endpoint 23 июля 2026 года вернула `404 chat.not.found`.
   * Оставлен для обратной совместимости.
   */
  async getByLink({
    chat_link,
  }: FlattenReq<GetChatByLinkDTO>): Promise<GetChatByLinkResponse> {
    return this._get('chats/{chat_link}', {
      path: { chat_link },
    });
  }

  /** Частично изменяет название, аватар или закреплённое сообщение чата либо канала. */
  async edit({
    chat_id,
    ...body
  }: FlattenReq<EditChatInfoDTO>): Promise<EditChatInfoResponse> {
    return this._patch('chats/{chat_id}', {
      path: { chat_id },
      body,
    });
  }

  /** Удаляет групповой чат или канал при наличии у бота соответствующего права. */
  async delete({
    chat_id,
  }: FlattenReq<DeleteChatDTO>): Promise<DeleteChatResponse> {
    return this._delete('chats/{chat_id}', {
      path: { chat_id },
    });
  }

  /** Возвращает информацию о текущем боте как участнике группового чата или канала. */
  async getChatMembership({
    chat_id,
  }: FlattenReq<GetChatMembershipDTO>): Promise<GetChatMembershipResponse> {
    return this._get('chats/{chat_id}/members/me', {
      path: { chat_id },
    });
  }

  /** Возвращает список администраторов группового чата или канала. */
  async getChatAdmins({
    chat_id,
  }: FlattenReq<GetChatAdminsDTO>): Promise<GetChatAdminsResponse> {
    return this._get('chats/{chat_id}/members/admins', {
      path: { chat_id },
    });
  }

  /** Назначает администраторов или полностью заменяет их права. */
  async setChatAdmins({
    chat_id,
    ...body
  }: FlattenReq<SetChatAdminsDTO>): Promise<SetChatAdminsResponse> {
    return this._post('chats/{chat_id}/members/admins', {
      path: { chat_id },
      body,
    });
  }

  /** Снимает права администратора, не исключая пользователя или бота из чата либо канала. */
  async deleteChatAdmin({
    chat_id,
    user_id,
  }: FlattenReq<DeleteChatAdminDTO>): Promise<DeleteChatAdminResponse> {
    return this._delete('chats/{chat_id}/members/admins/{user_id}', {
      path: { chat_id, user_id },
    });
  }

  /** Добавляет пользователей в групповой чат; подписчиков канала добавить нельзя. */
  async addChatMembers({
    chat_id,
    ...body
  }: FlattenReq<AddChatMembersDTO>): Promise<AddChatMembersResponse> {
    return this._post('chats/{chat_id}/members', {
      path: { chat_id },
      body,
    });
  }

  /** Возвращает участников группового чата или канала. */
  async getChatMembers({
    chat_id,
    ...query
  }: FlattenReq<GetChatMembersDTO>): Promise<GetChatMembersResponse> {
    return this._get('chats/{chat_id}/members', {
      path: { chat_id },
      query,
    });
  }

  /** Удаляет участника из группового чата или канала. */
  async removeChatMember({
    chat_id,
    ...query
  }: FlattenReq<RemoveChatMemberDTO>): Promise<RemoveChatMemberResponse> {
    return this._delete('chats/{chat_id}/members', {
      path: { chat_id },
      query,
    });
  }

  /** Возвращает закреплённое сообщение или пост. */
  async getPinnedMessage({
    chat_id,
  }: FlattenReq<GetPinnedMessageDTO>): Promise<GetPinnedMessageResponse> {
    return this._get('chats/{chat_id}/pin', {
      path: { chat_id },
    });
  }

  /** Закрепляет сообщение в групповом чате или пост в канале. */
  async pinMessage({
    chat_id,
    ...body
  }: FlattenReq<PinMessageDTO>): Promise<PinMessageResponse> {
    return this._put('chats/{chat_id}/pin', {
      path: { chat_id },
      body,
    });
  }

  /** Снимает закреплённое сообщение или пост. */
  async unpinMessage({
    chat_id,
  }: FlattenReq<UnpinMessageDTO>): Promise<UnpinMessageResponse> {
    return this._delete('chats/{chat_id}/pin', {
      path: { chat_id },
    });
  }

  /** Отправляет видимое пользователям действие бота в групповой чат. */
  async sendAction({
    chat_id,
    ...body
  }: FlattenReq<SendActionDTO>): Promise<SendActionResponse> {
    return this._post('chats/{chat_id}/actions', {
      path: { chat_id },
      body,
    });
  }

  /** Удаляет текущего бота из группового чата или канала. */
  async leaveChat({
    chat_id,
  }: FlattenReq<LeaveChatDTO>): Promise<LeaveChatResponse> {
    return this._delete('chats/{chat_id}/members/me', {
      path: { chat_id },
    });
  }
}
