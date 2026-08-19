import type {
  BotCommand,
  BotInfo,
  PhotoAttachmentRequestPayload,
} from '../../types';

/** Ответ `GET /me` с профилем бота, определённого access token. */
export type GetMyInfoResponse = BotInfo;

/** DTO частичного изменения профиля текущего бота. */
export type EditMyInfoDTO = {
  body: {
    /** Новое отображаемое имя или название бота. */
    first_name?: string | null;
    /** Новое второе имя бота. */
    last_name?: string | null;
    /** @deprecated Используйте `first_name`. */
    name?: string | null;
    /** Новое описание бота. */
    description?: string | null;
    /** Список команд бота. Передайте пустой массив, чтобы удалить команды. */
    commands?: BotCommand[] | null;
    /** Данные нового аватара бота. */
    photo?: PhotoAttachmentRequestPayload | null;
  };
};

/** Ответ с обновлённой информацией о текущем боте. */
export type EditMyInfoResponse = BotInfo;

/** DTO полной замены списка команд текущего бота. */
export type EditMyCommandsDTO = {
  body: {
    /** Новый список команд бота. Передайте пустой массив, чтобы удалить команды. */
    commands: BotCommand[];
  };
};

/** Ответ с обновлённым списком команд текущего бота. */
export type EditMyCommandsResponse = {
  /** Команды, настроенные для бота. */
  commands: BotCommand[];
};
