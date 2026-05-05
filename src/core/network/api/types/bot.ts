import type { UserWithPhoto } from './user';

/** Команда бота, которую клиенты Max могут показывать в меню команд. */
export type BotCommand = {
  /** Название команды без ведущего `/`. */
  name: string;
  /** Короткое описание команды для меню клиента. */
  description?: string | null;
};

/** Информация о текущем боте, возвращаемая методом `getMyInfo`. */
export type BotInfo = UserWithPhoto & {
  /** Список команд, настроенных для бота. */
  commands?: BotCommand[] | null;
};
