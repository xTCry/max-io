# 5. Сессии, сцены и i18n

`session`, `scene` и `i18n` вынесены в отдельные entrypoints. Так основной runtime остаётся компактным, а дополнительные зависимости подключаются только когда нужны.

Полный рабочий пример вынесен в [`examples/04-sessions-scenes-i18n`](../examples/04-sessions-scenes-i18n). Его можно использовать как проверяемую основу для typed context со связкой session, scene и i18n. В примере есть отдельная inline-сцена `/extra`: она меняет язык интерфейса, хранит промежуточный state сцены, редактирует callback-сообщения и сохраняет итог в session.

## Session

Session middleware хранит состояние между updates.

```ts
import { Bot, type Context } from 'max-io';
import { type ISessionContext, SessionManager } from 'max-io/lib/session';

type SessionState = ISessionContext & {
  visits?: number;
};

type MyContext = Context & {
  session: SessionState;
};

const bot = new Bot<MyContext>(process.env.MAX_BOT_TOKEN!);
const sessions = new SessionManager<SessionState, MyContext>({});

bot.use(sessions.middleware);

bot.command('start', async (ctx) => {
  ctx.session.visits = (ctx.session.visits ?? 0) + 1;
  await ctx.reply(`Визитов: ${ctx.session.visits}`);
});
```

По умолчанию используется memory storage. Для production лучше подключить внешнее хранилище.

## Redis storage

```bash
yarn add ioredis
```

```ts
import { RedisStorage, SessionManager } from 'max-io/lib/session';

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const sessions = new SessionManager({
  storage: new RedisStorage({
    redis,
    ttl: 7 * 24 * 3600,
  }),
});
```

## Scene

Scene manager строится поверх session. Подключайте session middleware до scene middleware.
Команды управления сценой, например `/cancel`, регистрируйте после `sceneManager.middleware`, но до `sceneManager.middlewareIntercept`, чтобы они успели обработаться до входа в текущий step.

```ts
import { SceneManager, StepScene } from 'max-io/lib/scene';

const introScene = new StepScene('intro', [
  async (ctx) => {
    await ctx.reply('Как тебя зовут?');
    await ctx.scene.step.next();
  },
  async (ctx) => {
    await ctx.reply(`Приятно познакомиться: ${ctx.message?.body?.text}`);
    await ctx.scene.leave();
  },
]);

const scenes = new SceneManager({ scenes: [introScene] });

bot.use(scenes.middleware);
bot.use(scenes.middlewareIntercept);

bot.command('intro', async (ctx) => {
  await ctx.scene.enter('intro');
});
```

## I18n

I18n использует YAML-файлы. Для этого нужна опциональная зависимость `js-yaml`.

```bash
yarn add js-yaml
```

```ts
import { I18n } from 'max-io/lib/i18n';

import { resolve } from 'node:path';

const i18n = new I18n({
  defaultLanguage: 'ru',
  directory: resolve(process.cwd(), 'locales'),
  useSession: true,
});

bot.use(i18n.middleware);
```

```yaml
# locales/ru.yml
start:
  hello: 'Привет, {name}!'
```

```ts
bot.command('start', async (ctx) => {
  await ctx.reply(
    ctx.i18n.t('start.hello', { name: ctx.message?.sender?.name }),
  );
});
```

## Typed context

Для приложения удобнее собрать один `Context`, который объединяет все расширения:

```ts
import type { Context } from 'max-io';
import type { I18nContext } from 'max-io/lib/i18n';
import type { ISessionContext } from 'max-io/lib/session';

type SessionState = ISessionContext & {
  locale?: string;
};

type MyContext = Context & {
  session: SessionState;
  i18n: I18nContext<Record<string, Record<string, unknown>>>;
};
```

После этого создавайте `Bot<MyContext>` и middleware будут работать с расширенным типом контекста.

<details>
<summary>Полный пример: session + scene + i18n + custom state</summary>

```ts
// src/index.ts
import 'dotenv/config';

import { Bot, type Context } from 'max-io';
import { I18n, type I18nContext } from 'max-io/lib/i18n';
import type { ISessionContext as I18nSessionContext } from 'max-io/lib/i18n';
import {
  SceneManager,
  type ISessionContainer as SceneSessionContainer,
  StepScene,
  type WithScene,
} from 'max-io/lib/scene';
import {
  type ISessionContext as BaseSessionContext,
  SessionManager,
} from 'max-io/lib/session';

import { resolve } from 'node:path';

type LocaleSchema = {
  'start.hello': { name?: string };
  'intro.name': never;
  'intro.done': { name?: string };
};

type AppSession = BaseSessionContext &
  I18nSessionContext &
  SceneSessionContainer & {
    visits?: number;
    draftName?: string;
  };

type AppState = {
  requestId?: string;
  isAdmin?: boolean;
};

type AppContextBase = Context & {
  session: AppSession;
  i18n: I18nContext<LocaleSchema>;
  state: AppState;
};

type AppContext = WithScene<AppContextBase>;

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is not set');

const bot = new Bot<AppContext>(token);

const sessionManager = new SessionManager<AppSession, AppContext>({});

const i18n = new I18n<LocaleSchema, AppContext>({
  defaultLanguage: 'ru',
  directory: resolve(process.cwd(), 'locales'),
  useSession: true,
});

const introScene = new StepScene<AppContextBase>('intro', [
  async (ctx) => {
    await ctx.reply(ctx.i18n.t('intro.name'));
    await ctx.scene.step.next();
  },
  async (ctx) => {
    ctx.session.draftName = ctx.message?.body?.text ?? undefined;
    await ctx.reply(ctx.i18n.t('intro.done', { name: ctx.session.draftName }));
    await ctx.scene.leave();
  },
]);

const sceneManager = new SceneManager<AppContextBase>({
  scenes: [introScene],
});

bot.use(sessionManager.middleware);
bot.use(i18n.middleware);
bot.use(sceneManager.middleware);
bot.use(sceneManager.middlewareIntercept);

bot.use(async (ctx, next) => {
  ctx.state.requestId = `${Date.now()}:${ctx.update.update_type}`;
  ctx.state.isAdmin = ctx.user?.user_id === Number(process.env.ADMIN_ID);
  await next();
});

bot.command('start', async (ctx) => {
  ctx.session.visits = (ctx.session.visits ?? 0) + 1;
  await ctx.reply(
    ctx.i18n.t('start.hello', {
      // name: ctx.user?.first_name,
      name: ctx.message?.sender?.name,
    }),
  );
});

bot.command('intro', async (ctx) => {
  await ctx.scene.enter('intro');
});

bot.start().then();
```

```yaml
# locales/ru.yml
start:
  hello: 'Привет, ${name}!'
intro:
  name: 'Как тебя зовут?'
  done: 'Приятно познакомиться, ${name}!'
```

</details>
