import { BaseApi } from '../../base-api';
import type { ReqOptions } from '../../client';
import type { FlattenReq } from '../types';
import type {
  DeleteCommentDTO,
  DeleteCommentResponse,
  EditCommentDTO,
  EditCommentResponse,
  GetCommentByIdDTO,
  GetCommentByIdResponse,
  GetCommentsDTO,
  GetCommentsResponse,
  SendCommentDTO,
  SendCommentResponse,
} from './types';

type SendCommentRequest = FlattenReq<SendCommentDTO> &
  Pick<ReqOptions, 'signal'>;

/** Raw API для чтения и изменения комментариев к постам в каналах. */
export class CommentsApi extends BaseApi {
  /** Возвращает страницу комментариев к посту. */
  async get({
    message_id,
    ...query
  }: FlattenReq<GetCommentsDTO>): Promise<GetCommentsResponse> {
    return this._get('messages/{message_id}/comments', {
      path: { message_id },
      query,
    });
  }

  async getById({
    message_id,
    comment_id,
  }: FlattenReq<GetCommentByIdDTO>): Promise<GetCommentByIdResponse> {
    return this._get('messages/{message_id}/comments/{comment_id}', {
      path: { message_id, comment_id },
    });
  }

  /** Создаёт комментарий к посту в канале. */
  async send({
    message_id,
    disable_link_preview,
    signal,
    ...body
  }: SendCommentRequest): Promise<SendCommentResponse> {
    return this._post('messages/{message_id}/comments', {
      path: { message_id },
      query: { disable_link_preview },
      body,
      signal,
    });
  }

  /** Редактирует комментарий к посту. */
  async edit({
    message_id,
    comment_id,
    ...body
  }: FlattenReq<EditCommentDTO>): Promise<EditCommentResponse> {
    return this._put('messages/{message_id}/comments', {
      path: { message_id },
      query: { comment_id },
      body,
    });
  }

  /** Удаляет комментарий к посту. */
  async delete({
    message_id,
    ...query
  }: FlattenReq<DeleteCommentDTO>): Promise<DeleteCommentResponse> {
    return this._delete('messages/{message_id}/comments', {
      path: { message_id },
      query,
    });
  }
}
