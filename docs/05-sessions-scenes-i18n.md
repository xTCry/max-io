# 5. Сессии, сцены и i18n

`session`, `scene` и `i18n` вынесены в отдельные entrypoints. Так основной runtime остаётся компактным, а дополнительные зависимости подключаются только когда нужны.

Полный рабочий пример вынесен в [`examples/04-sessions-scenes-i18n`](../examples/04-sessions-scenes-i18n/). Его можно использовать как проверяемую основу для typed context со связкой session, scene и i18n. В примере есть отдельная inline-сцена `/extra`: она меняет язык интерфейса, хранит промежуточный state сцены, редактирует callback-сообщения и сохраняет итог в session.

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

## Практический пример

Полный рабочий проект лежит в [`examples/04-sessions-scenes-i18n`](../examples/04-sessions-scenes-i18n/). Ниже оставлены только фрагменты, на которые стоит обратить внимание при переносе в свой бот. Если нужен код без пропусков и с импортами, открывайте example-проект.

Что есть в примере:

- `/intro` — простая step-scene с отдельным state для имени и возраста.
- `/extra` — inline-сцена с callback-кнопками, сменой языка, временными сообщениями, заметкой пользователя и сохранением результата в session.
- `src/types.ts` — пример typed context для связки `Context + session + scene + i18n + state`.
- `locales/ru.yml` и `locales/en.yml` — YAML-локали с одинаковыми ключами.

## Порядок middleware

Команды управления сценой лучше регистрировать до `middlewareIntercept`. Иначе активная step-scene первой получит обычное сообщение `/cancel` и может обработать его как ответ на текущий шаг. Фрагмент ниже показывает только порядок подключения.

```ts
bot.use(sessionManager.middleware);
bot.use(i18n.middleware);
bot.use(sceneManager.middleware);

bot.command('cancel', async (ctx) => {
  await ctx.scene.leave({ silent: true, canceled: true });
  await ctx.reply(ctx.i18n.t('scene.cancelled'));
});

bot.use(sceneManager.middlewareIntercept);
```

## Типизация state сцены

Общий `session` хранит долгоживущие данные, а `scene.state` лучше типизировать отдельно для каждого сценария. Так временные поля шага не смешиваются с общей session. Полная версия типов лежит в [`examples/04-sessions-scenes-i18n`](../examples/04-sessions-scenes-i18n/), файл `src/types.ts`.

```ts
export type IntroSceneState = {
  name?: string;
  age?: number;
};

export type ExtraSceneState = {
  language?: 'ru' | 'en';
  frequency?: 'daily' | 'weekly';
  note?: string;
  noteMid?: string;
};

export type IStepContext<S extends Record<string, unknown> = {}> =
  WithStepScene<AppContext<max.Update, S>, 'session'>;

const introScene = new StepScene<IStepContext<IntroSceneState>>(
  SceneType.Intro,
  steps,
);
```

## Callback-сообщения

Для inline-сцен удобнее редактировать текущее сообщение через `answerOnCallback({ message })`, а не отправлять новое сообщение на каждый шаг. Если сцена сама отправляла временные подсказки, их можно хранить в `session.tempMids` и удалять при завершении.

```ts
async function renderSceneMessage(
  ctx: IStepContext<ExtraSceneState>,
  text: string,
  keyboard?: InlineKeyboardAttachmentRequest,
) {
  const attachments = keyboard ? [keyboard] : [];

  if (ctx.updateType === 'message_callback') {
    await ctx.answerOnCallback({ message: { text, attachments } });
    return;
  }

  const message = await ctx.reply(text, { attachments });
  ctx.session.tempMids ??= [];
  ctx.session.tempMids.push(message.body.mid);
}
```

Если нужно очистить временные сообщения после callback, не удаляйте сообщение, которое сейчас редактируется через `answerOnCallback({ message })`.

```ts
async function cleanupTempMessages(
  ctx: IStepContext<ExtraSceneState>,
  keepMid?: string,
) {
  const mids = ctx.session.tempMids ?? [];
  ctx.session.tempMids = [];

  await Promise.allSettled(
    mids.filter((mid) => mid !== keepMid).map((mid) => ctx.deleteMessage(mid)),
  );
}
```

## Смена языка внутри сцены

При `useSession: true` выбранная локаль сохранится в session после middleware-chain. Чтобы пользователь сразу увидел новый язык, поменяйте локаль до перерисовки callback-сообщения.

```ts
languageStep.action(/extra:lang:(ru|en)/, async (ctx) => {
  const language = ctx.match![1] as 'ru' | 'en';

  ctx.scene.state.language = language;
  ctx.i18n.locale(language);

  await renderSceneMessage(
    ctx,
    ctx.i18n.t('scene.extra.chooseLanguage'),
    languageKeyboard(ctx),
  );
});
```

## Reply-link на сообщение пользователя

В `/extra` заметка пользователя сохраняется вместе с `mid`, чтобы итоговое сообщение могло сослаться на исходный текст как reply-link.

```ts
noteStep.on('message_created', async (ctx, next) => {
  const text = ctx.message?.body?.text?.trim();
  if (!text || text.startsWith('/')) return next();

  ctx.scene.state.note = text;
  ctx.scene.state.noteMid = ctx.message.body.mid;
  await ctx.scene.step.next();
});

await ctx.answerOnCallback({
  message: {
    text: ctx.i18n.t('scene.extra.saved'),
    link: { type: 'reply', mid: ctx.scene.state.noteMid! },
  },
});
```

Если клиент или конкретный метод не покажет reply-link при редактировании callback-сообщения, оставьте текст заметки в сообщении подтверждения. Полный пример уже хранит и текст, и `mid`, поэтому fallback делается без изменения flow.
