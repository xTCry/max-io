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
    /** Новое имя бота. */
    first_name?: string | null;
    /** Новая фамилия или второе имя бота. */
    last_name?: string | null;
    /** @deprecated Используйте `first_name`. */
    name?: string | null;
    /** Новое описание бота. */
    description?: string | null;
    /** Список команд бота. Передайте пустой массив, чтобы удалить команды. */
    commands?: BotCommand[] | null;
    /** Новая фотография профиля бота. */
    photo?: PhotoAttachmentRequestPayload | null;
  };
};

/** Ответ с обновлённой информацией о текущем боте. */
export type EditMyInfoResponse = BotInfo;
