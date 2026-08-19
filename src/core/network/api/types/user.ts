/** Общая информация о пользователе или боте без аватара. */
export type User = {
  /** Уникальный ID пользователя или бота. */
  user_id: number;
  /** Имя пользователя или бота. */
  first_name: string;
  /** Фамилия пользователя или бота, если она указана. */
  last_name?: string | null;
  /** @deprecated Используйте `first_name` и `last_name`. */
  name: string | null;
  /** Публичный username. У обычных пользователей часто отсутствует. */
  username: string | null;
  /** `true`, если объект описывает бота. */
  is_bot: boolean;
  /**
   * Время последней активности в Max, Unix timestamp в миллисекундах.
   * Может отсутствовать, если пользователь скрыл статус онлайн в настройках профиля.
   */
  last_activity_time?: number;
};

/** Пользователь или бот с данными аватара и описанием профиля. */
export type UserWithPhoto = User & {
  /** Описание профиля. Может отсутствовать или быть `null`. */
  description?: string | null;
  /** URL уменьшенной версии аватара, если он установлен. */
  avatar_url?: string;
  /** URL полной версии аватара, если он установлен. */
  full_avatar_url?: string;
};

// export const enum UserLocale {}
/** Код локали пользователя, если клиент передал его в update. */
export type UserLocale = 'ru' | string;
