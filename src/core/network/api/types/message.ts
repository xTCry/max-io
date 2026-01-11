import type { Attachment } from './attachment';
import type { ChatType } from './chat';
import type { MarkupElement } from './markup';
import type { User } from './user';

export type MessageSender = User;

export type MessageRecipient = {
  chat_id: number | null;
  chat_type: ChatType;
};

export type MessageBody = {
  mid: string;
  seq: number;
  text: string | null;
  attachments: Attachment[] | null;
  markup?: MarkupElement[] | null;
};

export type MessageLinkType = 'forward' | 'reply';

export type LinkedMessage = {
  type: MessageLinkType;
  sender?: MessageSender | null;
  chat_id?: number;
  message: MessageBody;
};

export type MessageStat = {
  views: number;
};

export type MessageConstructor = User;

export type Message = {
  sender?: MessageSender | null;
  recipient: MessageRecipient;
  timestamp: number;
  link?: LinkedMessage | null;
  body: MessageBody;
  stat?: MessageStat | null;
  url?: string | null;
  constructor?: MessageConstructor | null;
};

export type ConstructedMessage = Pick<
  Message,
  'sender' | 'timestamp' | 'link' | 'body'
>;
