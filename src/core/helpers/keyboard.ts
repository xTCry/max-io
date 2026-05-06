import type {
  InlineKeyboardAttachmentRequest,
  ReplyKeyboardAttachmentRequest,
} from '../network/api';

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

/**
 * Создаёт вложение reply keyboard.
 * Такая клавиатура отображается как панель быстрых ответов и отправляет сообщения от лица пользователя.
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
