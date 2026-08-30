import { describe, expect, it, vi } from 'vitest';

import type { Api } from './api';
import { Context } from './context';
import type {
  BotStartedUpdate,
  BotStoppedUpdate,
  CommentCreatedUpdate,
  CommentEditedUpdate,
  CommentRemovedUpdate,
  MessageCallbackUpdate,
  MessageCreatedUpdate,
  Update,
} from './network/api';

const botInfo = {
  user_id: 100,
  first_name: 'Test bot',
  name: 'Test bot',
  username: 'test_bot',
  is_bot: true,
};

const api = {} as Api;

const createMessageCreatedUpdate = (): MessageCreatedUpdate => ({
  update_type: 'message_created',
  timestamp: 1_700_000_000_000,
  message: {
    recipient: {
      chat_id: 42,
      chat_type: 'dialog',
      user_id: 100,
    },
    timestamp: 1_700_000_000_000,
    body: {
      mid: 'mid.test.1',
      seq: 1,
      text: 'hello',
      attachments: [
        {
          type: 'location',
          latitude: 55.751244,
          longitude: 37.618423,
        },
        {
          type: 'sticker',
          width: 512,
          height: 512,
          payload: {
            url: 'https://example.test/sticker.webp',
            code: 'sticker-code',
          },
        },
      ],
    },
    sender: {
      user_id: 7,
      first_name: 'Test',
      name: 'Test',
      username: null,
      is_bot: false,
    },
    constructor: null,
  },
});

const createMessageCallbackUpdate = (): MessageCallbackUpdate => ({
  update_type: 'message_callback',
  timestamp: 1_700_000_000_000,
  callback: {
    timestamp: 1_700_000_000_000,
    callback_id: 'callback.test.1',
    payload: 'confirm',
    user: {
      user_id: 7,
      first_name: 'Test',
      name: 'Test',
      username: null,
      is_bot: false,
    },
  },
  message: null,
});

const createBotStartedUpdate = (): BotStartedUpdate => ({
  update_type: 'bot_started',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  payload: 'from-deep-link',
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createBotStoppedUpdate = (): BotStoppedUpdate => ({
  update_type: 'bot_stopped',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createCommentCreatedUpdate = (): CommentCreatedUpdate => ({
  update_type: 'comment_created',
  timestamp: 1_700_000_000_000,
  message: createMessageCreatedUpdate().message,
});

const createCommentEditedUpdate = (): CommentEditedUpdate => ({
  update_type: 'comment_edited',
  timestamp: 1_700_000_000_000,
  message: createMessageCreatedUpdate().message,
});

const createCommentRemovedUpdate = (): CommentRemovedUpdate => ({
  update_type: 'comment_removed',
  timestamp: 1_700_000_000_000,
  message_id: 'comment.test.1',
  chat_id: 42,
  user_id: 7,
  post_id: 'post.test.1',
});

describe('Context', () => {
  it('предоставляет данные сообщения, отправителя и бота', () => {
    const update = createMessageCreatedUpdate();
    const context = new Context(update, api, botInfo);

    expect(context.updateType).toBe('message_created');
    expect(context.message).toBe(update.message);
    expect(context.messageId).toBe('mid.test.1');
    expect(context.chatId).toBe(42);
    expect(context.chatType).toBe('dialog');
    expect(context.sender).toBe(update.message.sender);
    expect(context.user).toBe(update.message.sender);
    expect(context.myId).toBe(100);
    expect(context.isMyMessage).toBe(false);
  });

  it('извлекает callback и пользователя callback-события', () => {
    const update = createMessageCallbackUpdate();
    const context = new Context(update, api, botInfo);

    expect(context.callback).toBe(update.callback);
    expect(context.user).toBe(update.callback.user);
    expect(context.message).toBeNull();
    expect(context.messageId).toBeUndefined();
  });

  it('возвращает payload запуска бота', () => {
    const context = new Context(createBotStartedUpdate(), api, botInfo);

    expect(context.startPayload).toBe('from-deep-link');
    expect(context.user?.user_id).toBe(7);
  });

  it('сужает update через строковый фильтр и guard', () => {
    const messageContext = new Context(createMessageCreatedUpdate(), api);
    const stoppedContext = new Context(createBotStoppedUpdate(), api);
    const commentContext = new Context(createCommentCreatedUpdate(), api);
    const editedCommentContext = new Context(createCommentEditedUpdate(), api);
    const isBotStopped = (update: Update): update is BotStoppedUpdate =>
      update.update_type === 'bot_stopped';

    expect(messageContext.has('message_created')).toBe(true);
    expect(messageContext.has('bot_stopped')).toBe(false);
    expect(stoppedContext.has(isBotStopped)).toBe(true);
    expect(commentContext.has('comment_created')).toBe(true);
    expect(commentContext.messageId).toBe('mid.test.1');
    expect(editedCommentContext.has('comment_edited')).toBe(true);
    expect(editedCommentContext.messageId).toBe('mid.test.1');

    const removedContext = new Context(createCommentRemovedUpdate(), api);
    expect(removedContext.has('comment_removed')).toBe(true);
    expect(removedContext.chatId).toBe(42);
    expect(removedContext.messageId).toBe('comment.test.1');
  });

  it('извлекает location и sticker из вложений', () => {
    const context = new Context(createMessageCreatedUpdate(), api);

    expect(context.location).toEqual({
      latitude: 55.751244,
      longitude: 37.618423,
    });
    expect(context.sticker).toEqual({
      width: 512,
      height: 512,
      url: 'https://example.test/sticker.webp',
      code: 'sticker-code',
    });
  });

  it('делегирует reply и replyTo в API с ссылкой на текущее сообщение', async () => {
    const sendMessageToChat = vi.fn(
      async () => createMessageCreatedUpdate().message,
    );
    const context = new Context(createMessageCreatedUpdate(), {
      sendMessageToChat,
    } as unknown as Api);

    await context.reply('reply', { notify: false });
    await context.replyTo('reply to', { format: 'markdown' });

    expect(sendMessageToChat).toHaveBeenNthCalledWith(1, 42, 'reply', {
      notify: false,
    });
    expect(sendMessageToChat).toHaveBeenNthCalledWith(2, 42, 'reply to', {
      link: { type: 'reply', mid: 'mid.test.1' },
      format: 'markdown',
    });
  });

  it('явно переданный chatId имеет приоритет в getChat и deleteMessage', async () => {
    const getChat = vi.fn(async () => undefined);
    const deleteMessage = vi.fn(async () => undefined);
    const context = new Context(createMessageCreatedUpdate(), {
      getChat,
      deleteMessage,
    } as unknown as Api);

    await context.getChat(77);
    await context.deleteMessage('mid.other');

    expect(getChat).toHaveBeenCalledWith(77);
    expect(deleteMessage).toHaveBeenCalledWith('mid.other');
  });

  it('делегирует answerOnCallback с callback_id текущего события', async () => {
    const answerOnCallback = vi.fn(async () => undefined);
    const context = new Context(createMessageCallbackUpdate(), {
      answerOnCallback,
    } as unknown as Api);

    await context.answerOnCallback({ notification: 'Done' });

    expect(answerOnCallback).toHaveBeenCalledWith('callback.test.1', {
      notification: 'Done',
    });
  });

  it('выдаёт понятную ошибку, если метод недоступен для события', async () => {
    const callbackContext = new Context(createMessageCallbackUpdate(), api);
    const stoppedContext = new Context(createBotStoppedUpdate(), api);

    await expect(callbackContext.reply('hello')).rejects.toThrow(
      'Max: "reply" isn\'t available for "message_callback"',
    );
    await expect(stoppedContext.answerOnCallback({})).rejects.toThrow(
      'Max: "answerOnCallback" isn\'t available for "bot_stopped"',
    );
  });
});
