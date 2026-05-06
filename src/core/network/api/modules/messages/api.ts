import createDebug from 'debug';
import { setTimeout } from 'node:timers/promises';

import { BaseApi } from '../../base-api';
import type { ReqOptions } from '../../client';
import { MaxError } from '../../error';
import type {
  FlattenReq,
  GetMessageDTO,
  GetMessageResponse,
  GetMessagesDTO,
  GetMessagesResponse,
  GetVideoAttachmentDetailsDTO,
  GetVideoAttachmentDetailsResponse,
  SendMessageResponse,
} from '../types';
import type {
  AnswerOnCallbackDTO,
  AnswerOnCallbackResponse,
  DeleteMessageDTO,
  EditMessageDTO,
  EditMessageResponse,
  SendMessageDTO,
} from './types';

const debug = createDebug('max-io:messages');

const ATTACHMENT_NOT_READY_MAX_ATTEMPTS = 5;
const ATTACHMENT_NOT_READY_INITIAL_DELAY_MS = 500;
const ATTACHMENT_NOT_READY_MAX_DELAY_MS = 4_000;

type SendMessageRequest = FlattenReq<SendMessageDTO> &
  Pick<ReqOptions, 'signal'>;

const getAttachmentNotReadyDelay = (attempt: number) => {
  return Math.min(
    ATTACHMENT_NOT_READY_INITIAL_DELAY_MS * 2 ** Math.max(attempt - 1, 0),
    ATTACHMENT_NOT_READY_MAX_DELAY_MS,
  );
};

const createAttachmentNotReadyRetryError = (
  error: MaxError,
  attempts: number,
) => {
  return new MaxError(error.status, {
    code: error.code,
    message: `${error.description}. Retry limit exceeded after ${attempts} attempts.`,
  });
};

export class MessagesApi extends BaseApi {
  get = async ({
    ...query
  }: FlattenReq<GetMessagesDTO>): Promise<GetMessagesResponse> => {
    return this._get('messages', {
      query,
    });
  };

  getById = async ({
    message_id,
  }: FlattenReq<GetMessageDTO>): Promise<GetMessageResponse> => {
    return this._get('messages/{message_id}', {
      path: { message_id },
    });
  };

  getVideoAttachmentDetails = async ({
    video_token,
  }: FlattenReq<GetVideoAttachmentDetailsDTO>): Promise<GetVideoAttachmentDetailsResponse> => {
    return this._get('videos/{video_token}', {
      path: { video_token },
    });
  };

  send = async ({
    chat_id,
    user_id,
    disable_link_preview,
    signal,
    ...body
  }: SendMessageRequest): Promise<SendMessageResponse> => {
    for (
      let attempt = 1;
      attempt <= ATTACHMENT_NOT_READY_MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this._post('messages', {
          body,
          query: { chat_id, user_id, disable_link_preview },
          signal,
        });
      } catch (err) {
        if (!(err instanceof MaxError) || err.code !== 'attachment.not.ready') {
          throw err;
        }

        if (attempt >= ATTACHMENT_NOT_READY_MAX_ATTEMPTS) {
          debug(
            'attachment.not.ready retry limit exceeded after %d attempts',
            attempt,
          );
          throw createAttachmentNotReadyRetryError(err, attempt);
        }

        const delay = getAttachmentNotReadyDelay(attempt);

        debug(
          'attachment.not.ready on attempt %d/%d, retrying in %dms',
          attempt,
          ATTACHMENT_NOT_READY_MAX_ATTEMPTS,
          delay,
        );

        // Даём вложению короткое время дозреть на стороне API,
        // но ограничиваем общее ожидание и уважаем AbortSignal.
        await setTimeout(delay, undefined, {
          signal,
        });
      }
    }

    throw new MaxError(500, {
      code: 'attachment.not.ready.retry.exhausted',
      message: 'Attachment retry loop ended unexpectedly.',
    });
  };

  edit = async ({
    message_id,
    ...body
  }: FlattenReq<EditMessageDTO>): Promise<EditMessageResponse> => {
    return this._put('messages', {
      query: { message_id },
      body,
    });
  };

  delete = async ({ ...query }: FlattenReq<DeleteMessageDTO>) => {
    return this._delete('messages', {
      query,
    });
  };

  answerOnCallback = async ({
    callback_id,
    ...body
  }: FlattenReq<AnswerOnCallbackDTO>): Promise<AnswerOnCallbackResponse> => {
    return this._post('answers', {
      query: { callback_id },
      body,
    });
  };
}
