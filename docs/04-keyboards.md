# 4. Клавиатуры

Клавиатуры в Max отправляются как attachment. В `max-io` для них есть namespace `Keyboard`.

```ts
import { Keyboard } from 'max-io';
```

## Inline keyboard

Inline-клавиатура состоит из строк, а каждая строка содержит кнопки.

```ts
const keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Обычная', 'intent:default'),
    Keyboard.button.callback('Да', 'intent:yes', { intent: 'positive' }),
    Keyboard.button.callback('Нет', 'intent:no', { intent: 'negative' }),
  ],
  [Keyboard.button.link('Открыть Max', 'https://max.ru')],
]);

await ctx.reply('Выбери действие', {
  attachments: [keyboard],
});
```

## Callback button

```ts
Keyboard.button.callback('Профиль', 'profile:open');
```

При нажатии бот получит update `message_callback`.

```ts
bot.action('profile:open', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Открываем профиль' });
});
```

`payload` ограничен Bot API, поэтому не храните в нём большие данные. Лучше передавать короткий key/id.

## Link button

```ts
Keyboard.button.link('Документация', 'https://dev.max.ru');
```

Кнопка открывает URL на стороне клиента.

## Open app button

```ts
Keyboard.button.openApp('Открыть mini app', 'my_bot', 'payload');
```

Параметры:

- `text` — текст кнопки;
- `webApp` — публичное имя бота или ссылка на mini app;
- `payload` — необязательный параметр запуска;
- `contactId` — необязательный ID бота/контакта.

## Message и clipboard

```ts
Keyboard.button.message('Отправить этот текст');
Keyboard.button.clipboard('Скопировать промокод', 'PROMO-2026');
```

- `message` отправляет текст кнопки в чат от лица пользователя.
- `clipboard` копирует payload в буфер обмена, если клиент Max поддерживает этот тип.

## Request contact / geolocation

```ts
Keyboard.button.requestContact('Отправить контакт');
Keyboard.button.requestGeoLocation('Отправить геолокацию', { quick: true });
```

После нажатия бот получает сообщение с contact/geolocation attachment, если пользователь подтвердит отправку и клиент поддерживает сценарий.

## Проверочные сценарии

- [`examples/01-basic-minimum`](../examples/01-basic-minimum/), файл `src/keyboard-bot.ts` — inline-кнопки и request-кнопки.
