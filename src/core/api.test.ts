import { describe, expect, it, vi } from 'vitest';

import { Api } from './api';
import type { Client, CommentMessage, Message } from './network/api';

const createApi = () => new Api({ call: vi.fn() } as unknown as Client);

const message = {
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
    attachments: null,
  },
} as Message;

const comment = {
  recipient: message.recipient,
  timestamp: 1_700_000_000_000,
  body: {
    mid: 'comment.test.1',
    seq: 1,
    text: 'Comment',
  },
} as CommentMessage;

describe('Api', () => {
  it('разворачивает message при отправке в чат и пользователю', async () => {
    const api = createApi();
    const send = vi
      .spyOn(api.raw.messages, 'send')
      .mockResolvedValue({ message });

    await expect(
      api.sendMessageToChat(42, 'Hello', { notify: false }),
    ).resolves.toBe(message);
    await expect(api.sendMessageToUser(7, 'Hi')).resolves.toBe(message);

    expect(send).toHaveBeenNthCalledWith(1, {
      chat_id: 42,
      text: 'Hello',
      notify: false,
    });
    expect(send).toHaveBeenNthCalledWith(2, { user_id: 7, text: 'Hi' });
  });

  it('преобразует массивы идентификаторов в query-строки', async () => {
    const api = createApi();
    const getMessages = vi.spyOn(api.raw.messages, 'get').mockResolvedValue({
      messages: [],
    });
    const getComments = vi.spyOn(api.raw.comments, 'get').mockResolvedValue({
      messages: [],
    });
    const getMembers = vi
      .spyOn(api.raw.chats, 'getChatMembers')
      .mockResolvedValue({
        members: [],
      });

    await api.getMessages(42, { message_ids: ['mid.1', 'mid.2'], count: 10 });
    await api.getComments('post.1', {
      comment_ids: ['comment.1', 'comment.2'],
    });
    await api.getChatMembers(42, { user_ids: [7, 8] });

    expect(getMessages).toHaveBeenCalledWith({
      chat_id: 42,
      message_ids: 'mid.1,mid.2',
      count: 10,
    });
    expect(getComments).toHaveBeenCalledWith({
      message_id: 'post.1',
      comment_ids: 'comment.1,comment.2',
    });
    expect(getMembers).toHaveBeenCalledWith({ chat_id: 42, user_ids: '7,8' });
  });

  it('передаёт команды и сохраняет aliases set/delete', async () => {
    const api = createApi();
    const editMyCommands = vi
      .spyOn(api.raw.bots, 'editMyCommands')
      .mockResolvedValue({ commands: [] });
    const commands = [{ name: 'start', description: 'Start bot' }];

    await api.editMyCommands(commands);
    await api.setMyCommands(commands);
    await api.deleteMyCommands();

    expect(editMyCommands).toHaveBeenNthCalledWith(1, { commands });
    expect(editMyCommands).toHaveBeenNthCalledWith(2, { commands });
    expect(editMyCommands).toHaveBeenNthCalledWith(3, { commands: [] });
  });

  it('собирает аргументы chat, callback и subscriptions методов', async () => {
    const api = createApi();
    const editChat = vi
      .spyOn(api.raw.chats, 'edit')
      .mockResolvedValue({} as never);
    const answer = vi
      .spyOn(api.raw.messages, 'answerOnCallback')
      .mockResolvedValue({ success: true });
    const getUpdates = vi
      .spyOn(api.raw.subscriptions, 'getUpdates')
      .mockResolvedValue({ updates: [], marker: null });
    const subscribe = vi
      .spyOn(api.raw.subscriptions, 'subscribe')
      .mockResolvedValue({ success: true });
    const unsubscribe = vi
      .spyOn(api.raw.subscriptions, 'unsubscribe')
      .mockResolvedValue({ success: true });

    await api.editChatInfo(42, {
      title: 'New title',
      description: 'New description',
      notify: false,
    });
    await api.answerOnCallback('callback.1', {
      disable_link_preview: true,
      notification: 'Done',
    });
    await api.getUpdates(['message_created', 'comment_created'], { limit: 10 });
    await api.subscribe({
      url: 'https://bot.example.test/updates',
      update_types: ['message_created'],
    });
    await api.unsubscribe('https://bot.example.test/updates');

    expect(editChat).toHaveBeenCalledWith({
      chat_id: 42,
      title: 'New title',
      description: 'New description',
      notify: false,
    });
    expect(answer).toHaveBeenCalledWith({
      callback_id: 'callback.1',
      disable_link_preview: true,
      notification: 'Done',
    });
    expect(getUpdates).toHaveBeenCalledWith({
      types: 'message_created,comment_created',
      limit: 10,
    });
    expect(subscribe).toHaveBeenCalledWith({
      url: 'https://bot.example.test/updates',
      update_types: ['message_created'],
    });
    expect(unsubscribe).toHaveBeenCalledWith({
      url: 'https://bot.example.test/updates',
    });
  });

  it('разворачивает message при отправке комментария', async () => {
    const api = createApi();
    const send = vi
      .spyOn(api.raw.comments, 'send')
      .mockResolvedValue({ message: comment });

    await expect(
      api.sendComment('post.1', 'Comment', { format: 'markdown' }),
    ).resolves.toBe(comment);

    expect(send).toHaveBeenCalledWith({
      message_id: 'post.1',
      text: 'Comment',
      format: 'markdown',
    });
  });
});
