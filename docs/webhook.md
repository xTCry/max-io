# Webhook

`max-io` поддерживает webhook на двух уровнях:

- встроенный runtime через `bot.start({ webhook })`;
- callback для своего HTTP-сервера через `bot.webhookCallback(...)`.

Webhook URL должен быть публичным HTTPS endpoint. Для локальной разработки обычно используют tunnel: `cloudflared`, `ngrok` или аналог.

Официальная документация Max называет webhook основным механизмом доставки событий для продуктовых интеграций. Long polling ограничен по скорости и сроку хранения событий, поэтому его лучше оставлять для разработки и ручной проверки.

## Встроенный сервер

```ts
import 'dotenv/config';

import { Bot } from 'max-io';

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is not set');

const bot = new Bot(token);

bot.command('ping', async (ctx) => {
  await ctx.reply('pong');
});

await bot.start({
  allowedUpdates: ['message_created', 'message_callback'],
  webhook: {
    domain: 'https://example.com',
    port: 3000,
    secret: process.env.MAX_WEBHOOK_SECRET,
  },
});
```

Если `path` не указан, библиотека сгенерирует безопасный стабильный path по токену. Это снижает риск случайных запросов на очевидный endpoint вроде `/webhook`.

```ts
await bot.start({
  webhook: {
    domain: 'https://example.com',
    path: '/max-webhook',
    port: 3000,
  },
});
```

## Свой HTTP server

Если в приложении уже есть HTTP-сервер, используйте `webhookCallback`.

```ts
import { Bot } from 'max-io';

import { createServer } from 'node:http';

const bot = new Bot(process.env.MAX_BOT_TOKEN!);

bot.command('ping', async (ctx) => {
  await ctx.reply('pong');
});

bot.botInfo ??= await bot.api.getMyInfo();

const server = createServer(
  bot.webhookCallback('/max-webhook', {
    secret: process.env.MAX_WEBHOOK_SECRET,
  }),
);

server.listen(3000);
```

`webhookCallback` проверяет:

- HTTP method `POST`;
- path запроса;
- заголовок `x-max-bot-api-secret`, если передан `secret`;
- JSON body update;
- передачу update в middleware через `bot.handleUpdate(...)`.

## Подписки

Низкоуровневые API-методы доступны через `bot.api`:

```ts
const subscriptions = await bot.api.getSubscriptions();

await bot.api.subscribe({
  url: 'https://example.com/max-webhook',
  update_types: ['message_created'],
  secret: process.env.MAX_WEBHOOK_SECRET,
});

await bot.api.unsubscribe('https://example.com/max-webhook');
```

Runtime helpers собирают URL так же, как встроенный webhook runtime:

```ts
const callback = await bot.createWebhook({
  domain: 'https://example.com',
  path: '/max-webhook',
  secret: process.env.MAX_WEBHOOK_SECRET,
});

await bot.deleteWebhook({
  domain: 'https://example.com',
  path: '/max-webhook',
});
```

## Очистка старых webhook-подписок

По умолчанию `max-io` предотвращает конфликт delivery-режимов:

- `bot.start()` удаляет все webhook-подписки перед long polling;
- `bot.start({ webhook })` удаляет webhook-подписки с другими URL;
- `bot.createWebhook(...)` удаляет webhook-подписки с другими URL.

Если нужно оставить старые подписки:

```ts
await bot.start({ deletePreviousWebhooks: false });

await bot.start({
  webhook: {
    domain: 'https://example.com',
    deletePreviousWebhooks: false,
  },
});
```

## Локальная проверка

1. Запустите tunnel на локальный порт.
2. Укажите публичный URL в `domain` или `.env` example-проекта.
3. Запустите [`examples/03-webhook-subscriptions`](../examples/03-webhook-subscriptions/).

Example-проект поддерживает два режима:

- `builtin` — сервер запускает `bot.start({ webhook })`;
- `custom` — свой `node:http` server подключает `bot.webhookCallback(...)`.
