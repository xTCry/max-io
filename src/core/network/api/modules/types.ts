import type { ReqOptions } from '../client';
import type {
  EditMyInfoDTO,
  EditMyInfoResponse,
  GetMyInfoResponse,
} from './bots/types';
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
} from './chats/types';
import type {
  AnswerOnCallbackDTO,
  AnswerOnCallbackResponse,
  DeleteMessageDTO,
  DeleteMessageResponse,
  EditMessageDTO,
  EditMessageResponse,
  GetMessageDTO,
  GetMessageResponse,
  GetMessagesDTO,
  GetMessagesResponse,
  GetVideoAttachmentDetailsDTO,
  GetVideoAttachmentDetailsResponse,
  SendMessageDTO,
  SendMessageResponse,
} from './messages/types';
import type {
  GetSubscriptionsDTO,
  GetSubscriptionsResponse,
  GetUpdatesDTO,
  GetUpdatesResponse,
  SubscribeDTO,
  SubscribeResponse,
  UnsubscribeDTO,
  UnsubscribeResponse,
} from './subscriptions/types';
import type { GetUploadUrlDTO, GetUploadUrlResponse } from './uploads/types';

export * from './bots/types';
export * from './messages/types';
export * from './subscriptions/types';

export type FlattenReq<T extends Omit<ReqOptions, 'method'>> = T['body'] &
  T['query'] &
  T['path'];

export type ApiMethods = {
  GET: {
    chats: {
      req: GetAllChatsDTO;
      res: GetAllChatsResponse;
    };
    'chats/{chat_id}': {
      req: GetChatByIdDTO;
      res: GetChatByIdResponse;
    };
    'chats/{chat_id}/members/admins': {
      req: GetChatAdminsDTO;
      res: GetChatAdminsResponse;
    };
    'chats/{chat_id}/members': {
      req: GetChatMembersDTO;
      res: GetChatMembersResponse;
    };
    'chats/{chat_id}/members/me': {
      req: GetChatMembershipDTO;
      res: GetChatMembershipResponse;
    };
    'chats/{chat_id}/pin': {
      req: GetPinnedMessageDTO;
      res: GetPinnedMessageResponse;
    };
    'chats/{chat_link}': {
      req: GetChatByLinkDTO;
      res: GetChatByLinkResponse;
    };
    me: {
      req: {};
      res: GetMyInfoResponse;
    };
    updates: {
      req: GetUpdatesDTO;
      res: GetUpdatesResponse;
    };
    subscriptions: {
      req: GetSubscriptionsDTO;
      res: GetSubscriptionsResponse;
    };
    messages: {
      req: GetMessagesDTO;
      res: GetMessagesResponse;
    };
    'messages/{message_id}': {
      req: GetMessageDTO;
      res: GetMessageResponse;
    };
    'videos/{video_token}': {
      req: GetVideoAttachmentDetailsDTO;
      res: GetVideoAttachmentDetailsResponse;
    };
  };
  POST: {
    'chats/{chat_id}/actions': {
      req: SendActionDTO;
      res: SendActionResponse;
    };
    'chats/{chat_id}/members': {
      req: AddChatMembersDTO;
      res: AddChatMembersResponse;
    };
    'chats/{chat_id}/members/admins': {
      req: SetChatAdminsDTO;
      res: SetChatAdminsResponse;
    };
    messages: {
      req: SendMessageDTO;
      res: SendMessageResponse;
    };
    uploads: {
      req: GetUploadUrlDTO;
      res: GetUploadUrlResponse;
    };
    answers: {
      req: AnswerOnCallbackDTO;
      res: AnswerOnCallbackResponse;
    };
    subscriptions: {
      req: SubscribeDTO;
      res: SubscribeResponse;
    };
  };
  PATCH: {
    me: {
      req: EditMyInfoDTO;
      res: EditMyInfoResponse;
    };
    'chats/{chat_id}': {
      req: EditChatInfoDTO;
      res: EditChatInfoResponse;
    };
  };
  PUT: {
    messages: {
      req: EditMessageDTO;
      res: EditMessageResponse;
    };
    'chats/{chat_id}/pin': {
      req: PinMessageDTO;
      res: PinMessageResponse;
    };
  };
  DELETE: {
    'chats/{chat_id}': {
      req: DeleteChatDTO;
      res: DeleteChatResponse;
    };
    messages: {
      req: DeleteMessageDTO;
      res: DeleteMessageResponse;
    };
    'chats/{chat_id}/pin': {
      req: UnpinMessageDTO;
      res: UnpinMessageResponse;
    };
    'chats/{chat_id}/members': {
      req: RemoveChatMemberDTO;
      res: RemoveChatMemberResponse;
    };
    'chats/{chat_id}/members/me': {
      req: LeaveChatDTO;
      res: LeaveChatResponse;
    };
    'chats/{chat_id}/members/admins/{user_id}': {
      req: DeleteChatAdminDTO;
      res: DeleteChatAdminResponse;
    };
    subscriptions: {
      req: UnsubscribeDTO;
      res: UnsubscribeResponse;
    };
  };
};
