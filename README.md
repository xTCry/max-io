<p align="center">
  <img src="./docs/assets/max-io-logo.svg" alt="Max IO" width="360">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/max-io"><img src="https://img.shields.io/npm/v/max-io.svg?style=flat-square" alt="npm"></a>
  <a href="https://www.npmjs.com/package/max-io"><img src="https://img.shields.io/npm/dt/max-io.svg?style=flat-square" alt="npm downloads"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/max-io.svg?style=flat-square" alt="license"></a>
  <a href="https://github.com/xtcry/max-io"><img src="https://img.shields.io/github/last-commit/xtcry/max-io?style=flat-square" alt="GitHub last commit"></a>
</p>

> **Max IO** — TypeScript-фреймворк для разработки чат-ботов в мессенджере **Max**. Библиотека даёт middleware-runtime, typed context, long polling, webhook, upload helpers, клавиатуры и дополнительные модули для session/scene/i18n.

## Возможности

| Возможность        | Что даёт                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| Middleware-runtime | `bot.use`, `bot.on`, `bot.command`, `bot.hears`, `bot.action`                          |
| Typed Context      | `ctx.reply`, `ctx.message`, `ctx.args`, `ctx.payload`, `ctx.state`, `ctx.api`          |
| Long polling       | `bot.start()`, marker API, режим для разработки и тестирования                         |
| Webhook            | `bot.start({ webhook })`, `webhookCallback`, `createWebhook`, `deleteWebhook`          |
| Upload             | image/video/audio/file, progress, timeout, `AbortSignal`, retry `attachment.not.ready` |
| Клавиатуры         | inline keyboard, `open_app`, `message`, `clipboard`, reply keyboard types              |
| Модули             | `max-io/lib/session`, `max-io/lib/scene`, `max-io/lib/i18n`                            |

## Установка

```bash
npm i max-io
```

```bash
yarn add max-io
```

Требуется Node.js `>=14.13.1`.

## Первый бот

Создайте токен бота в Max и передайте его через переменную окружения `MAX_BOT_TOKEN`.

```ts
import 'dotenv/config';

import { Bot, Keyboard } from 'max-io';

const bot = new Bot(process.env.MAX_BOT_TOKEN!);

bot.command('start', async (ctx) => {
  await ctx.reply('Привет! Я бот на Max IO.', {
    attachments: [
      Keyboard.inlineKeyboard([
        [Keyboard.button.callback('Проверить callback', 'demo:callback')],
      ]),
    ],
  });
});

bot.command('echo', async (ctx) => {
  const text = ctx.payload || 'Напиши /echo любой текст';
  await ctx.reply(text);
});

bot.action('demo:callback', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Callback получен' });
});

bot.start().then();
```

Команды поддерживают payload и args:

```ts
bot.command('ban', async (ctx) => {
  const [userId, ...reasonParts] = ctx.args ?? [];
  const reason = reasonParts.join(' ');

  await ctx.reply(`userId=${userId}; reason=${reason || 'не указана'}`);
});
```

Подробнее: [`docs/01-first-bot.md`](./docs/01-first-bot.md) и [`docs/02-listen-and-respond.md`](./docs/02-listen-and-respond.md).

## Webhook за минуту

```ts
import 'dotenv/config';

import { Bot } from 'max-io';

const bot = new Bot(process.env.MAX_BOT_TOKEN!);

bot.command('ping', async (ctx) => {
  await ctx.reply('pong from webhook');
});

await bot.start({
  webhook: {
    domain: 'https://example.com',
    port: 3000,
    secret: process.env.MAX_WEBHOOK_SECRET,
  },
});
```

Если `path` не указан, `max-io` создаёт безопасный стабильный path по токену. При запуске webhook по умолчанию удаляются старые подписки с другими URL; при запуске polling удаляются все webhook-подписки.

Подробнее: [`docs/webhook.md`](./docs/webhook.md).

## Polling marker

`marker` нужен, чтобы продолжить long polling с конкретной позиции. Если `marker` не передать, Max API возвращает только последнее обновление, поэтому события, накопившиеся пока бот был недоступен, не будут прочитаны автоматически.

```ts
const bot = new Bot(process.env.MAX_BOT_TOKEN!, {
  polling: { marker: Number(process.env.MAX_POLLING_MARKER) || undefined },
});
// или
bot.polling.setMarker(123456);
console.log(bot.polling.marker);
// или
await bot.start({ marker: bot.polling.marker });
```

> Long polling стоит использовать для разработки и ручной проверки. Для production Max рекомендует Webhook; с 11.05.2026 для polling заявлены ограничения: `2 RPS`, timeout `30` секунд, batch до `100` событий и TTL событий `24` часа.

## Upload и вложения

```ts
bot.command('video', async (ctx) => {
  const video = await ctx.api.uploadVideo({
    source: './public/video.mp4',
    onProgress: ({ loaded, total }) => {
      if (total) console.log(`upload ${Math.round((loaded / total) * 100)}%`);
    },
  });

  await ctx.reply('Видео загружено', {
    attachments: [video.toJson()],
  });
});
```

Подробнее: [`docs/03-attachments-and-uploads.md`](./docs/03-attachments-and-uploads.md).

## Клавиатуры

```ts
const keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Callback', 'payload')],
  [Keyboard.button.openApp('Открыть mini app', 'my_bot', 'demo')],
  [Keyboard.button.clipboard('Скопировать', 'promo-code')],
]);
```

Подробнее: [`docs/04-keyboards.md`](./docs/04-keyboards.md).

## Дополнительные модули

```ts
import { I18n } from 'max-io/lib/i18n';
import { SceneManager, StepScene } from 'max-io/lib/scene';
import { SessionManager } from 'max-io/lib/session';
```

- `max-io/lib/session` — session middleware с memory/Redis storage.
- `max-io/lib/scene` — сцены и step-сценарии поверх session.
- `max-io/lib/i18n` — YAML-локализация с поддержкой session.

Подробнее: [`docs/05-sessions-scenes-i18n.md`](./docs/05-sessions-scenes-i18n.md).

## Документация

- [`docs/01-first-bot.md`](./docs/01-first-bot.md) — установка, токен, первый запуск.
- [`docs/02-listen-and-respond.md`](./docs/02-listen-and-respond.md) — updates, команды, ответы, форматирование.
- [`docs/03-attachments-and-uploads.md`](./docs/03-attachments-and-uploads.md) — вложения, upload, progress, cancel.
- [`docs/04-keyboards.md`](./docs/04-keyboards.md) — inline/reply клавиатуры и типы кнопок.
- [`docs/webhook.md`](./docs/webhook.md) — webhook runtime, custom server, subscriptions.
- [`docs/05-sessions-scenes-i18n.md`](./docs/05-sessions-scenes-i18n.md) — session, scene, i18n.
- [`docs/api-notes.md`](./docs/api-notes.md) — важные оговорки по поведению Max API.

## Entry points

| Import               | Назначение                                               |
| -------------------- | -------------------------------------------------------- |
| `max-io`             | Runtime, `Bot`, `Context`, `Api`, helpers, основные типы |
| `max-io/types`       | Публичные типы Bot API                                   |
| `max-io/lib/session` | Session middleware                                       |
| `max-io/lib/scene`   | Scene manager                                            |
| `max-io/lib/i18n`    | I18n middleware                                          |

## Примеры

В репозитории есть отдельные TypeScript-проекты для ручной проверки:

- [`examples/01-basic-minimum`](./examples/01-basic-minimum/) — базовые команды, вложения, клавиатуры, upload.
- [`examples/02-chat-admin-management`](./examples/02-chat-admin-management/) — управление администраторами чата.
- [`examples/03-webhook-subscriptions`](./examples/03-webhook-subscriptions/) — webhook runtime, subscribe/unsubscribe, custom server mode.
- [`examples/04-sessions-scenes-i18n`](./examples/04-sessions-scenes-i18n/) — typed context, session, scene и i18n.
- [`examples/pr-scenarios`](./examples/pr-scenarios/) — сценарии для проверки PR/issues и спорного поведения API.

## Полезные модули

- [`nestjs-max`](https://github.com/xtcry/nestjs-max) — интеграция Max IO с NestJS.

## Статус API

Max Bot API развивается, а часть поведения зависит от серверной реализации и клиента Max. В проекте есть ручные сценарии проверки для upload, webhook, reply keyboard, chat admin API и video details. Если поведение API не подтверждено схемой или живой проверкой, лучше фиксировать это отдельно перед изменением публичных типов.

## Лицензия

MIT. Подробности по сторонним ориентирам и лицензиям см. в [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
