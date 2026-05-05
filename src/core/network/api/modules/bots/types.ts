import type {
  BotCommand,
  BotInfo,
  PhotoAttachmentRequestPayload,
} from '../../types';

/** Ответ с информацией о текущем боте. */
export type GetMyInfoResponse = BotInfo;

/** DTO изменения профиля текущего бота. */
export type EditMyInfoDTO = {
  body: {
    /** Новое отображаемое имя бота. */
    name?: string | null;
    /** Новое описание бота. */
    description?: string | null;
    /** Список команд бота. Передайте пустой массив, чтобы удалить команды. */
    commands?: BotCommand[] | null;
    /** Новая фотография профиля бота. */
    photo?: PhotoAttachmentRequestPayload;
  };
};

/** Ответ с обновлённой информацией о текущем боте. */
export type EditMyInfoResponse = BotInfo;
