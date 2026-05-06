import type { InlineKeyboardAttachmentRequest } from '../network/api';

/**
 * Создаёт вложение inline keyboard.
 * Клавиатура в Bot API — двумерный массив кнопок: строки и кнопки внутри строки.
 */
export const inlineKeyboard = (
  buttons: InlineKeyboardAttachmentRequest['payload']['buttons'],
): InlineKeyboardAttachmentRequest => {
  return {
    type: 'inline_keyboard',
    payload: { buttons },
  };
};

export * as button from './buttons';
