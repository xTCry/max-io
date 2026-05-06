import type {
  InlineKeyboardAttachmentRequest,
  ReplyKeyboardAttachmentRequest,
} from '../network/api';

/**
 * Создаёт вложение inline keyboard.
 * Клавиатура в Bot API — двумерный массив кнопок: строки и кнопки внутри строки.
 *
 * @param buttons Двумерный массив inline-кнопок.
 */
export const inlineKeyboard = (
  buttons: InlineKeyboardAttachmentRequest['payload']['buttons'],
): InlineKeyboardAttachmentRequest => {
  return {
    type: 'inline_keyboard',
    payload: { buttons },
  };
};

/**
 * Создаёт вложение reply keyboard.
 * Такая клавиатура отображается как панель быстрых ответов и отправляет сообщения от лица пользователя.
 *
 * @param buttons Двумерный массив reply-кнопок.
 * @param extra Настройки показа клавиатуры в групповом чате.
 * @remarks Сервер принимает `reply_keyboard`, но визуальная поддержка зависит от клиента Max.
 */
export const replyKeyboard = (
  buttons: ReplyKeyboardAttachmentRequest['buttons'],
  extra?: Omit<ReplyKeyboardAttachmentRequest, 'type' | 'buttons'>,
): ReplyKeyboardAttachmentRequest => {
  return {
    type: 'reply_keyboard',
    buttons,
    ...extra,
  };
};

export * as button from './buttons';
