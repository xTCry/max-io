import { describe, expect, it } from 'vitest';

import * as button from './buttons';
import { inlineKeyboard, replyKeyboard } from './keyboard';

describe('keyboard helpers', () => {
  it('создаёт inline keyboard с callback и link кнопками', () => {
    const buttons = [
      [
        button.callback('Подтвердить', 'confirm'),
        button.link('Документация', 'https://max.ru/docs'),
      ],
    ];

    expect(inlineKeyboard(buttons)).toEqual({
      type: 'inline_keyboard',
      payload: { buttons },
    });
  });

  it('создаёт reply keyboard и сохраняет дополнительные настройки', () => {
    expect(
      replyKeyboard([[button.sendMessage('Продолжить', 'next')]], {
        direct: true,
        direct_user_id: 7,
      }),
    ).toEqual({
      type: 'reply_keyboard',
      buttons: [[{ type: 'message', text: 'Продолжить', payload: 'next' }]],
      direct: true,
      direct_user_id: 7,
    });
  });
});

describe('button helpers', () => {
  it('создаёт inline-кнопки с их параметрами', () => {
    expect(button.requestContact('Контакт')).toEqual({
      type: 'request_contact',
      text: 'Контакт',
    });
    expect(button.requestGeoLocation('Геолокация', { quick: true })).toEqual({
      type: 'request_geo_location',
      text: 'Геолокация',
      quick: true,
    });
    expect(button.openApp('Открыть', 'example_bot', 'start', 7)).toEqual({
      type: 'open_app',
      text: 'Открыть',
      web_app: 'example_bot',
      payload: 'start',
      contact_id: 7,
    });
    expect(button.message('Написать')).toEqual({
      type: 'message',
      text: 'Написать',
    });
    expect(button.clipboard('Копировать', 'payload')).toEqual({
      type: 'clipboard',
      text: 'Копировать',
      payload: 'payload',
    });
  });

  it('создаёт reply и legacy chat кнопки', () => {
    expect(button.sendContact('Контакт')).toEqual({
      type: 'user_contact',
      text: 'Контакт',
      payload: undefined,
    });
    expect(button.sendGeoLocation('Гео', 'location', { quick: true })).toEqual({
      type: 'user_geo_location',
      text: 'Гео',
      payload: 'location',
      quick: true,
    });
    expect(
      button.chat('Создать чат', 'Новый чат', { uuid: 'legacy-id' }),
    ).toEqual({
      type: 'chat',
      text: 'Создать чат',
      chat_title: 'Новый чат',
      uuid: 'legacy-id',
    });
  });
});
