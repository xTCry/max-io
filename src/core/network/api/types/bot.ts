import type { UserWithPhoto } from './user';

/** Команда, которую клиенты Max могут показать в меню бота. */
export type BotCommand = {
  /** Название команды без ведущего `/`; список содержит не более 32 команд. */
  name: string;
  /** Короткое описание команды для меню клиента. */
  description?: string | null;
};

/** Информация о текущем боте, возвращаемая методом `getMyInfo`. */
export type BotInfo = UserWithPhoto & {
  /** Список команд, настроенных для бота. */
  commands?: BotCommand[] | null;
};
