import { describe, expect, it } from 'vitest';

import type { Client, ReqOptions } from './client';
import { RawApi } from './raw-api';

type RecordedCall = {
  method: string;
  options: ReqOptions;
};

const createRawApi = () => {
  const calls: RecordedCall[] = [];
  const client = {
    call: async (call: RecordedCall) => {
      calls.push(call);
      return { status: 200, data: {}, responseText: '' };
    },
  } as Client;

  return { raw: new RawApi(client), calls };
};

const expectCall = (
  calls: RecordedCall[],
  method: string,
  options: ReqOptions,
) => {
  expect(calls).toEqual([{ method, options }]);
};

describe('RawApi endpoint mapping', () => {
  it('сопоставляет методы Bots API с HTTP-запросами', async () => {
    const { raw, calls } = createRawApi();

    await raw.bots.getMyInfo();
    expectCall(calls, 'me', { method: 'GET' });

    calls.length = 0;
    await raw.bots.editMyInfo({ first_name: 'Test bot' });
    expectCall(calls, 'me', {
      method: 'PATCH',
      body: { first_name: 'Test bot' },
    });

    calls.length = 0;
    await raw.bots.editMyCommands({ commands: [] });
    expectCall(calls, 'me/commands', {
      method: 'PATCH',
      body: { commands: [] },
    });
  });

  it('сопоставляет методы Chats API с HTTP-запросами', async () => {
    const { raw, calls } = createRawApi();
    const cases: Array<{
      title: string;
      invoke: () => Promise<unknown>;
      method: string;
      options: ReqOptions;
    }> = [
      {
        title: 'getAll',
        invoke: () => raw.chats.getAll({ count: 10 }),
        method: 'chats',
        options: { method: 'GET', query: { count: 10 } },
      },
      {
        title: 'getById',
        invoke: () => raw.chats.getById({ chat_id: 1 }),
        method: 'chats/{chat_id}',
        options: { method: 'GET', path: { chat_id: 1 } },
      },
      {
        title: 'getByLink',
        invoke: () => raw.chats.getByLink({ chat_link: 'news' }),
        method: 'chats/{chat_link}',
        options: { method: 'GET', path: { chat_link: 'news' } },
      },
      {
        title: 'edit',
        invoke: () => raw.chats.edit({ chat_id: 1, title: 'New title' }),
        method: 'chats/{chat_id}',
        options: {
          method: 'PATCH',
          path: { chat_id: 1 },
          body: { title: 'New title' },
        },
      },
      {
        title: 'delete',
        invoke: () => raw.chats.delete({ chat_id: 1 }),
        method: 'chats/{chat_id}',
        options: { method: 'DELETE', path: { chat_id: 1 } },
      },
      {
        title: 'getChatMembership',
        invoke: () => raw.chats.getChatMembership({ chat_id: 1 }),
        method: 'chats/{chat_id}/members/me',
        options: { method: 'GET', path: { chat_id: 1 } },
      },
      {
        title: 'getChatAdmins',
        invoke: () => raw.chats.getChatAdmins({ chat_id: 1 }),
        method: 'chats/{chat_id}/members/admins',
        options: { method: 'GET', path: { chat_id: 1 } },
      },
      {
        title: 'setChatAdmins',
        invoke: () => raw.chats.setChatAdmins({ chat_id: 1, admins: [] }),
        method: 'chats/{chat_id}/members/admins',
        options: {
          method: 'POST',
          path: { chat_id: 1 },
          body: { admins: [] },
        },
      },
      {
        title: 'deleteChatAdmin',
        invoke: () => raw.chats.deleteChatAdmin({ chat_id: 1, user_id: 2 }),
        method: 'chats/{chat_id}/members/admins/{user_id}',
        options: { method: 'DELETE', path: { chat_id: 1, user_id: 2 } },
      },
      {
        title: 'addChatMembers',
        invoke: () => raw.chats.addChatMembers({ chat_id: 1, user_ids: [2] }),
        method: 'chats/{chat_id}/members',
        options: {
          method: 'POST',
          path: { chat_id: 1 },
          body: { user_ids: [2] },
        },
      },
      {
        title: 'getChatMembers',
        invoke: () => raw.chats.getChatMembers({ chat_id: 1, count: 10 }),
        method: 'chats/{chat_id}/members',
        options: {
          method: 'GET',
          path: { chat_id: 1 },
          query: { count: 10 },
        },
      },
      {
        title: 'removeChatMember',
        invoke: () => raw.chats.removeChatMember({ chat_id: 1, user_id: 2 }),
        method: 'chats/{chat_id}/members',
        options: {
          method: 'DELETE',
          path: { chat_id: 1 },
          query: { user_id: 2 },
        },
      },
      {
        title: 'getPinnedMessage',
        invoke: () => raw.chats.getPinnedMessage({ chat_id: 1 }),
        method: 'chats/{chat_id}/pin',
        options: { method: 'GET', path: { chat_id: 1 } },
      },
      {
        title: 'pinMessage',
        invoke: () => raw.chats.pinMessage({ chat_id: 1, message_id: 'mid.1' }),
        method: 'chats/{chat_id}/pin',
        options: {
          method: 'PUT',
          path: { chat_id: 1 },
          body: { message_id: 'mid.1' },
        },
      },
      {
        title: 'unpinMessage',
        invoke: () => raw.chats.unpinMessage({ chat_id: 1 }),
        method: 'chats/{chat_id}/pin',
        options: { method: 'DELETE', path: { chat_id: 1 } },
      },
      {
        title: 'sendAction',
        invoke: () => raw.chats.sendAction({ chat_id: 1, action: 'typing_on' }),
        method: 'chats/{chat_id}/actions',
        options: {
          method: 'POST',
          path: { chat_id: 1 },
          body: { action: 'typing_on' },
        },
      },
      {
        title: 'leaveChat',
        invoke: () => raw.chats.leaveChat({ chat_id: 1 }),
        method: 'chats/{chat_id}/members/me',
        options: { method: 'DELETE', path: { chat_id: 1 } },
      },
    ];

    for (const testCase of cases) {
      calls.length = 0;
      await testCase.invoke();
      expectCall(calls, testCase.method, testCase.options);
    }
  });

  it('сопоставляет методы Messages и Comments API с HTTP-запросами', async () => {
    const { raw, calls } = createRawApi();
    const cases: Array<{
      title: string;
      invoke: () => Promise<unknown>;
      method: string;
      options: ReqOptions;
    }> = [
      {
        title: 'get messages',
        invoke: () => raw.messages.get({ chat_id: 1 }),
        method: 'messages',
        options: { method: 'GET', query: { chat_id: 1 } },
      },
      {
        title: 'get message by id',
        invoke: () => raw.messages.getById({ message_id: 'mid.1' }),
        method: 'messages/{message_id}',
        options: { method: 'GET', path: { message_id: 'mid.1' } },
      },
      {
        title: 'get video attachment details',
        invoke: () =>
          raw.messages.getVideoAttachmentDetails({ video_token: 'video' }),
        method: 'videos/{video_token}',
        options: { method: 'GET', path: { video_token: 'video' } },
      },
      {
        title: 'send message',
        invoke: () => raw.messages.send({ chat_id: 1, text: 'Hello' }),
        method: 'messages',
        options: {
          method: 'POST',
          query: {
            chat_id: 1,
            user_id: undefined,
            disable_link_preview: undefined,
          },
          body: { text: 'Hello' },
          signal: undefined,
        },
      },
      {
        title: 'edit message',
        invoke: () => raw.messages.edit({ message_id: 'mid.1', text: 'Hello' }),
        method: 'messages',
        options: {
          method: 'PUT',
          query: { message_id: 'mid.1' },
          body: { text: 'Hello' },
        },
      },
      {
        title: 'delete message',
        invoke: () => raw.messages.delete({ message_id: 'mid.1' }),
        method: 'messages',
        options: { method: 'DELETE', query: { message_id: 'mid.1' } },
      },
      {
        title: 'answer callback',
        invoke: () => raw.messages.answerOnCallback({ callback_id: 'cb.1' }),
        method: 'answers',
        options: {
          method: 'POST',
          query: { callback_id: 'cb.1' },
          body: {},
        },
      },
      {
        title: 'get comments',
        invoke: () => raw.comments.get({ message_id: 'post.1', count: 10 }),
        method: 'messages/{message_id}/comments',
        options: {
          method: 'GET',
          path: { message_id: 'post.1' },
          query: { count: 10 },
        },
      },
      {
        title: 'get comment by id',
        invoke: () =>
          raw.comments.getById({
            message_id: 'post.1',
            comment_id: 'comment.1',
          }),
        method: 'messages/{message_id}/comments/{comment_id}',
        options: {
          method: 'GET',
          path: { message_id: 'post.1', comment_id: 'comment.1' },
        },
      },
      {
        title: 'send comment',
        invoke: () =>
          raw.comments.send({ message_id: 'post.1', text: 'Hello' }),
        method: 'messages/{message_id}/comments',
        options: {
          method: 'POST',
          path: { message_id: 'post.1' },
          query: { disable_link_preview: undefined },
          body: { text: 'Hello' },
          signal: undefined,
        },
      },
      {
        title: 'edit comment',
        invoke: () =>
          raw.comments.edit({
            message_id: 'post.1',
            comment_id: 'comment.1',
            text: 'Hello',
          }),
        method: 'messages/{message_id}/comments',
        options: {
          method: 'PUT',
          path: { message_id: 'post.1' },
          query: { comment_id: 'comment.1' },
          body: { text: 'Hello' },
        },
      },
      {
        title: 'delete comment',
        invoke: () =>
          raw.comments.delete({
            message_id: 'post.1',
            comment_id: 'comment.1',
          }),
        method: 'messages/{message_id}/comments',
        options: {
          method: 'DELETE',
          path: { message_id: 'post.1' },
          query: { comment_id: 'comment.1' },
        },
      },
    ];

    for (const testCase of cases) {
      calls.length = 0;
      await testCase.invoke();
      expectCall(calls, testCase.method, testCase.options);
    }
  });

  it('сопоставляет методы Subscriptions и Uploads API с HTTP-запросами', async () => {
    const { raw, calls } = createRawApi();
    const cases: Array<{
      invoke: () => Promise<unknown>;
      method: string;
      options: ReqOptions;
    }> = [
      {
        invoke: () => raw.subscriptions.getUpdates({ limit: 10 }),
        method: 'updates',
        options: { method: 'GET', query: { limit: 10 }, signal: undefined },
      },
      {
        invoke: () => raw.subscriptions.getSubscriptions(),
        method: 'subscriptions',
        options: { method: 'GET' },
      },
      {
        invoke: () =>
          raw.subscriptions.subscribe({ url: 'https://example.test/hook' }),
        method: 'subscriptions',
        options: {
          method: 'POST',
          body: { url: 'https://example.test/hook' },
        },
      },
      {
        invoke: () =>
          raw.subscriptions.unsubscribe({ url: 'https://example.test/hook' }),
        method: 'subscriptions',
        options: {
          method: 'DELETE',
          query: { url: 'https://example.test/hook' },
        },
      },
      {
        invoke: () => raw.uploads.getUploadUrl({ type: 'image' }),
        method: 'uploads',
        options: { method: 'POST', query: { type: 'image' } },
      },
    ];

    for (const testCase of cases) {
      calls.length = 0;
      await testCase.invoke();
      expectCall(calls, testCase.method, testCase.options);
    }
  });
});
