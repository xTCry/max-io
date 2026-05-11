# 1. Первый бот

Этот раздел показывает минимальный путь от пустого проекта до работающего бота на `max-io`.

## Получите token

Создайте бота в Max ([@MasterBot](https://max.ru/masterbot)) и получите token. В коде лучше не хранить token напрямую: передавайте его через переменные окружения.

```bash
MAX_BOT_TOKEN="<token>"
```

## Создайте проект

```bash
mkdir my-max-bot
cd my-max-bot
yarn init -y
yarn add max-io dotenv
yarn add -D typescript tsx @types/node
```

Создайте `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

Добавьте script в `package.json`:

```json
{
  "scripts": {
    "start": "tsx src/index.ts"
  }
}
```

## Напишите bot-код

```ts
// src/index.ts
import 'dotenv/config';

import { Bot } from 'max-io';

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is not set');

const bot = new Bot(token);

bot.command('start', async (ctx) => {
  await ctx.reply('Добро пожаловать!');
});

bot.hears(/ping/i, async (ctx) => {
  await ctx.reply('pong');
});

bot.on('message_created', async (ctx, next) => {
  if (ctx.message?.body?.text?.startsWith('/')) return next();

  return ctx.reply('Напиши /start или ping');
});

bot.start().then();
```

## Запустите

```bash
MAX_BOT_TOKEN="<token>" yarn start
```

Если используете `.env`, создайте файл:

```env
MAX_BOT_TOKEN=<token>
```

и запускайте:

```bash
yarn start
```

## Что происходит

- `new Bot(token)` создаёт runtime и API-клиент.
- `bot.command('start', ...)` реагирует на `/start` и варианты с mention бота.
- `bot.hears(/ping/i, ...)` реагирует на текст сообщения.
- `bot.on('message_created', ...)` получает raw update указанного типа.
- `bot.start()` запускает long polling и начинает получать новые updates. Для production лучше перейти на webhook.

## Следующий шаг

- Для команд, ответов и форматирования см. [`02-listen-and-respond.md`](./02-listen-and-respond.md).
- Для вложений и upload см. [`03-attachments-and-uploads.md`](./03-attachments-and-uploads.md).
- Для webhook см. [`webhook.md`](./webhook.md).
