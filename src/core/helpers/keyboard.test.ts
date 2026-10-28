import { describe, expect, it } from 'vitest';

import * as button from './buttons';
import * as keyboard from './keyboard';
import { inlineKeyboard } from './keyboard';

describe('keyboard helpers', () => {
  it('не экспортирует удалённые reply и legacy chat helpers', () => {
    expect(keyboard).not.toHaveProperty('replyKeyboard');
    expect(button).not.toHaveProperty('sendMessage');
    expect(button).not.toHaveProperty('sendContact');
    expect(button).not.toHaveProperty('sendGeoLocation');
    expect(button).not.toHaveProperty('chat');
  });
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
});
