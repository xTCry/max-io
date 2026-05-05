/** Успешный ответ API для методов без отдельной payload-схемы. */
type SuccessResponse = {
  success: true;
};

/** Ошибка бизнес-операции, когда HTTP-запрос мог завершиться успешно. */
type ErrorResponse = {
  success: false;
  /** Сообщение с причиной отказа, если сервер его вернул. */
  message?: string;
};

/** Общий ответ API для действий вроде удаления, закрепления или изменения участников. */
export type ActionResponse = SuccessResponse | ErrorResponse;
