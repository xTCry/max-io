# Max IO

[![npm](https://img.shields.io/npm/v/max-io.svg?style=flat-square)](https://www.npmjs.com/package/max-io)
[![npm](https://img.shields.io/npm/dt/max-io.svg?style=flat-square)](https://www.npmjs.com/package/max-io)
[![GitHub last commit](https://img.shields.io/github/last-commit/xtcry/max-io)](https://github.com/xtcry/max-io)

<img src="https://avatars.githubusercontent.com/u/201088336?s=120&v=1" title="Max logotype" align="right" width="80" height="80">

> **Max IO** — TypeScript-фреймворк для разработки чат-ботов в мессенджере **Max**. ([на основе *max-bot-api*](https://github.com/max-messenger/max-bot-api-client-ts))

## Возможности

- Middleware-архитектура в стиле [telegraf](https://github.com/telegraf/telegraf/tree/v4) (`use`, `on`, `hears`, `command`, `action`)
- Строготипизированный `Context` и удобные хелперы для Max API
- Long polling из коробки (`bot.start()`, `bot.stop()`)
- *WebhHook в процесе разработки*
- Дополнительные модули: *session, scene, i18n*

## Установка

```bash
# NPM
npm i max-io

# Yarn
yarn add max-io
```

## Полезные модули

- [nestjs-max](https://github.com/xtcry/nestjs-max): Module for [NestJS](https://github.com/nestjs/nest)

## Быстрый старт

```ts
import { Bot } from 'max-io';

const bot = new Bot(process.env.MAX_BOT_TOKEN!);

bot.command('start', async (ctx) => {
  await ctx.reply('Привет из Max IO');
});

bot.hears(/ping/i, async (ctx) => {
  await ctx.reply('pong');
});

bot.action('like', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Принято' });
});

bot.start();
```

## Основные модули

### Сессии (`max-io/lib/session`)

Session middleware с подключаемым хранилищем (по умолчанию — память). Можно использовать вместе со *сценами* и *i18n*.

> Опциональная peer dependency для *Redis*:

```bash
yarn add ioredis
```

```ts
import { Bot } from 'max-io';
import { SessionManager, RedisStorage } from 'max-io/lib/session';
// import Redis from 'ioredis';

// const redis = new Redis();
const bot = new Bot(process.env.MAX_BOT_TOKEN!);
const sessionManager = new SessionManager({
  // storage: new RedisStorage({
  //   redis,
  //   ttl: 7 * 24 * 3600,
  // }),
});

bot.use(sessionManager.middleware);
```

### Сцены (`max-io/lib/scene`)

Scene manager с использованием сессий (на оснвое [сцен vk-io](https://github.com/negezor/vk-io/tree/master/packages/scenes)).

```ts
import { SceneManager, StepScene } from 'max-io/lib/scene';

const sceneManager = new SceneManager({
  scenes: [new StepScene('intro', [/* ... */])],
});

bot.use(sceneManager.middleware);
bot.use(sceneManager.middlewareIntercept);
```

### I18n (`max-io/lib/i18n`)

I18n с yaml ресурсами и поддержкой сессий.

Опциональная peer dependency:

```bash
yarn add js-yaml
```

```ts
import { I18n } from 'max-io/lib/i18n';

const i18n = new I18n({
  defaultLanguage: 'ru',
  directory: './locales',
  useSession: true,
});

bot.use(i18n.middleware);
```

### Пример использования *(typed context + i18n + session)*

<details>
<summary>Показать код</summary>

```ts
// ./src/index.ts
import * as max from 'max-io/lib/types';
import { Bot, type Context } from 'max-io';
import { I18n } from 'max-io/lib/i18n';
import type {
  I18nContext,
  ISessionContext as ISessionContextI18n,
} from 'max-io/lib/i18n';
import {
  type ISessionContext as ISessionContextSession,
  SessionManager,
} from 'max-io/lib/session';

import { resolve } from 'path';

// * I18n
export const i18n: I18n = new I18n({
  defaultLanguage: 'ru',
  directory: resolve(process.cwd(), './locales'),
  defaultLanguageOnMissing: true,
  useSession: true,
});

// * Interface
export type AnyObj = Record<string, unknown>;

export type CombinedContext = {
  session: ISessionState;
  i18n: I18nContext<Record<LocalePhrase, AnyObj | never>>;
};

export interface ISessionState
  extends ISessionContextI18n, ISessionContextSession {
  lastStartPayload?: string;
  requestAuthCode?: string;

  tempAuthMids?: string[];
}

type BaseContext<
  T extends AnyObj = {},
  U extends max.Update = max.Update,
> = CombinedContext & Context<U> & T;

export type IContext<
  T extends AnyObj = {},
  U extends max.Update = max.Update,
> = BaseContext<T, U>;

export type IMessageContext<T extends AnyObj = {}> = IContext<
  T,
  max.MessageCreatedUpdate | max.MessageEditedUpdate
>;
export type ICallbackContext<T extends AnyObj = {}> = IContext<
  T,
  max.MessageCallbackUpdate
>;

// * i18n
export enum LocalePhrase {
  OnStarted = 'pages.started.content',
  Page_Start = 'pages.start.content',
  // ...
}

// * Bot
const bot = new Bot<IContext>(process.env.MAX_BOT_TOKEN!);

const sessionManager = new SessionManager({});
bot.use(sessionManager.middleware);
bot.use(i18n.middleware);

// Listeners
bot.on('bot_started', async (ctx) => {
  await ctx.reply(ctx.i18n.t(LocalePhrase.OnStarted), {
    format: 'html',
  });
});

bot.command('start', async (ctx) => {
  const time = new Date().toLocaleString();
  await ctx.replyTo(ctx.i18n.t(LocalePhrase.Page_Start, { time }), {
    format: 'html',
  });
});

bot.start();
```

```yml
# ./locales/ru.yml
pages:
  started:
    content: 'Привет! Используй команду /start'
  start:
    content: 'Текущее время: <b>{time}</b>'
```
</details>

## Public exports

- `max-io` - core API (`Bot`, `Api`, `Context`, `Composer`, helpers)
- `max-io/types` - API types
- `max-io/lib/session` - session middleware
- `max-io/lib/scene` - scenes middleware
- `max-io/lib/i18n` - i18n middleware
