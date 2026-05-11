import 'dotenv/config';

import { Bot } from 'max-io';
import { I18n } from 'max-io/lib/i18n';
import { SceneManager, StepScene } from 'max-io/lib/scene';
import { SessionManager } from 'max-io/lib/session';

import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { extraScene } from './extra-scene';
import {
  AppContext,
  AppSession,
  IntroSceneState,
  IStepContext,
  LocaleSchema,
  SceneType,
} from './types';

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is not set');

const logsDir = resolve(process.cwd(), 'logs-bot');
const adminId = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : undefined;

const bot = new Bot<AppContext>(token);

const sessionManager = new SessionManager<AppSession, AppContext>({});

const i18n = new I18n<LocaleSchema, AppContext>({
  defaultLanguage: 'ru',
  directory: resolve(process.cwd(), 'locales'),
  useSession: true,
});

const introScene = new StepScene<IStepContext<IntroSceneState>>(
  SceneType.Intro,
  [
    async (ctx) => {
      if (ctx.scene.step.firstTime || !ctx.message?.body?.text) {
        await ctx.reply(ctx.i18n.t('scene.intro.name'));
        return;
      }

      ctx.scene.state.name = ctx.message.body.text.trim();
      await ctx.scene.step.next();
    },
    async (ctx) => {
      if (ctx.scene.step.firstTime || !ctx.message?.body?.text) {
        await ctx.reply(
          ctx.i18n.t('scene.intro.age', { name: ctx.scene.state.name }),
        );
        return;
      }

      const age = Number(ctx.message.body.text.trim());
      if (!Number.isInteger(age) || age <= 0) {
        await ctx.reply(ctx.i18n.t('scene.intro.invalidAge'));
        return;
      }

      ctx.scene.state.age = age;
      await ctx.scene.step.next();
    },
    async (ctx) => {
      const { name = ctx.message?.sender?.name, age } = ctx.scene.state;
      if (!age) {
        await ctx.scene.leave();
        return;
      }

      // Сохраняем в общей session только то, что пригодится вне intro-сцены.
      ctx.session.realName = name;

      await ctx.reply(ctx.i18n.t('scene.intro.done', { name, age }));
      await ctx.scene.leave();
    },
  ],
);

const sceneManager = new SceneManager<IStepContext>({
  scenes: [introScene, extraScene],
});

async function logUpdate(ctx: AppContext) {
  await mkdir(logsDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const botName = ctx.botInfo?.username ?? 'bot';
  const filePath = join(logsDir, `${botName}-${date}.jsonl`);
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    data: {
      marker: bot.polling.marker,
      update: ctx.update,
    },
  });

  await appendFile(filePath, `${line}\n`, 'utf8');
}

bot.use(async (ctx, next) => {
  ctx.state.requestId = `${Date.now()}:${ctx.update.update_type}`;
  ctx.state.isAdmin = adminId !== undefined && ctx.user?.user_id === adminId;

  await next();

  void logUpdate(ctx).catch((error: unknown) => {
    console.error('[04-sessions-scenes-i18n] logger failed', error);
  });
});

bot.use(sessionManager.middleware);
bot.use(i18n.middleware);
bot.use(sceneManager.middleware);

// Важно: команды управления сценой должны быть зарегистрированы ДО middlewareIntercept.
// Иначе активная step-scene первой заберёт обычное сообщение `/cancel` как ответ на текущий шаг.
bot.command('cancel', async (ctx) => {
  await ctx.scene.leave({ silent: true, canceled: true });
  await ctx.reply(ctx.i18n.t('scene.cancelled'));
});
bot.action('scene:cancel', async (ctx) => {
  await ctx.scene.leave({ silent: true, canceled: true });
  await ctx.reply(ctx.i18n.t('scene.cancelled'));
});

bot.command('intro', async (ctx) => {
  await ctx.scene.enter(SceneType.Intro);
});

bot.command('extra', async (ctx) => {
  await ctx.scene.enter(SceneType.Extra);
});

bot.action('scene:extra', async (ctx) => {
  await ctx.scene.enter(SceneType.Extra);
});

// middlewareIntercept запускает текущий step для всех остальных сообщений,
// если пользователь уже находится внутри scene.
bot.use(sceneManager.middlewareIntercept);

bot.command('start', async (ctx) => {
  ctx.session.visits = (ctx.session.visits ?? 0) + 1;

  await ctx.reply(
    ctx.i18n.t('start.hello', {
      name: ctx.session.realName ?? ctx.message?.sender?.name,
      visits: ctx.session.visits,
    }),
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(ctx.i18n.t('help.content'));
});

bot.on('message_created', async (ctx) => {
  const text = ctx.message?.body?.text;
  if (text?.startsWith('/')) return;

  await ctx.reply(ctx.i18n.t('fallback.content'));
});

bot
  .start()
  .then(() => {
    console.log('Bot stopped');
  })
  .catch((error: unknown) => {
    console.error('Bot failed', error);
    process.exitCode = 1;
  });
