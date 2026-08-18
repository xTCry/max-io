import type { ReqOptions } from '../../client';
import type { ActionResponse, CommentMessage } from '../../types';
import type { FlattenReq } from '../types';

type CommentPath = {
  /** ID поста в канале (`mid`). */
  message_id: string;
};

/** DTO получения комментариев к посту в канале. */
export type GetCommentsDTO = {
  path: CommentPath;
  query: {
    /** Список ID комментариев через запятую. При передаче сервер игнорирует пагинацию. */
    comment_ids?: string | null;
    /** Верхняя граница времени комментариев, Unix timestamp в миллисекундах. */
    before?: number;
    /** Нижняя граница времени комментариев, Unix timestamp в миллисекундах. */
    after?: number;
    /** Количество комментариев: от `1` до `100`, по умолчанию `50`. */
    count?: number;
  };
};

/** Параметры `api.getComments` без ID поста. */
export type GetCommentsExtra = Omit<
  FlattenReq<GetCommentsDTO>,
  'message_id' | 'comment_ids'
> & {
  /** ID комментариев для выборочного запроса. */
  comment_ids?: string[];
};

/** Ответ со страницей комментариев. */
export type GetCommentsResponse = {
  /** Список комментариев к посту. */
  messages: CommentMessage[];
};

/** DTO получения одного комментария. */
export type GetCommentByIdDTO = {
  path: CommentPath & {
    /** ID комментария (`mid`). */
    comment_id: string;
  };
};

/** Ответ с комментарием. */
export type GetCommentByIdResponse = CommentMessage;

/** Содержимое нового или редактируемого комментария. */
export type NewCommentBody = {
  /** Текст комментария. Ограничение API: до `4000` символов. */
  text?: string | null;
  /** Ответ на комментарий. Пересылка комментариев не поддерживается. */
  link?: { type: 'reply'; mid: string } | null;
  /** Формат текста комментария: `markdown` или `html`. */
  format?: 'markdown' | 'html' | null;
};

/** DTO отправки комментария к посту. */
export type SendCommentDTO = {
  path: CommentPath;
  query: {
    /** Если `false`, сервер не будет генерировать предпросмотр ссылок в тексте. */
    disable_link_preview?: boolean;
  };
  body: NewCommentBody;
  /** Сигнал отмены HTTP-запроса. */
  signal?: AbortSignal;
};

/** Параметры `api.sendComment` без ID поста и текста. */
export type SendCommentExtra = Omit<
  FlattenReq<SendCommentDTO>,
  'message_id' | 'text'
> &
  Pick<ReqOptions, 'signal'>;

/** Ответ после создания комментария. */
export type SendCommentResponse = {
  /** Созданный комментарий. */
  message: CommentMessage;
};

/** DTO редактирования комментария. */
export type EditCommentDTO = {
  path: CommentPath;
  query: {
    /** ID редактируемого комментария. */
    comment_id: string;
  };
  body: NewCommentBody;
};

/** Параметры `api.editComment` без ID поста и комментария. */
export type EditCommentExtra = Omit<
  FlattenReq<EditCommentDTO>,
  'message_id' | 'comment_id'
>;

/** Ответ редактирования комментария. */
export type EditCommentResponse = ActionResponse;

/** DTO удаления комментария. */
export type DeleteCommentDTO = {
  path: CommentPath;
  query: {
    /** ID удаляемого комментария. */
    comment_id: string;
  };
};

/** Ответ удаления комментария. */
export type DeleteCommentResponse = ActionResponse;
