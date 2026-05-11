import { Composer, Keyboard } from 'max-io';
import { StepScene, type StepSceneHandler } from 'max-io/lib/scene';
import type {
  InlineKeyboardAttachmentRequest,
  Message,
  MessageLinkType,
} from 'max-io/types';

import { type ExtraSceneState, type IStepContext, SceneType } from './types';

const TEMP_MIDS_LIMIT = 20;

const compact = <T>(items: Array<T | undefined>): T[] => {
  return items.filter((item): item is T => item !== undefined);
};

const checked = (active: boolean, text: string) => {
  return active ? `✓ ${text}` : text;
};

function rememberTempMessage(
  ctx: IStepContext<ExtraSceneState>,
  message: Message,
) {
  ctx.session.tempMids ??= [];
  ctx.session.tempMids.push(message.body.mid);

  // Держим короткий хвост временных сообщений, чтобы session не росла бесконечно.
  if (ctx.session.tempMids.length > TEMP_MIDS_LIMIT) {
    ctx.session.tempMids.splice(
      0,
      ctx.session.tempMids.length - TEMP_MIDS_LIMIT,
    );
  }
}

async function cleanupTempMessages(
  ctx: IStepContext<ExtraSceneState>,
  options: { keepMid?: string } = {},
) {
  const mids = ctx.session.tempMids ?? [];
  ctx.session.tempMids = [];

  await Promise.allSettled(
    mids
      .filter((mid) => mid !== options.keepMid)
      .map((mid) => ctx.deleteMessage(mid)),
  );
}

async function notifyCallback(
  ctx: IStepContext<ExtraSceneState>,
  text: string,
) {
  if (ctx.updateType === 'message_callback') {
    await ctx.answerOnCallback({ notification: text });
    return;
  }

  await ctx.reply(text);
}

async function renderSceneMessage(
  ctx: IStepContext<ExtraSceneState>,
  text: string,
  keyboard?: InlineKeyboardAttachmentRequest,
  link?: { type: MessageLinkType; mid: string },
) {
  const attachments = compact([keyboard]);

  if (ctx.updateType === 'message_callback') {
    // Для callback меняем текущее сообщение, а не отправляем новое.
    // Так старые inline-кнопки не остаются активными в чате.
    await ctx.answerOnCallback({
      message: { text, attachments, link },
    });
    return;
  }

  const message = await ctx.reply(text, { attachments, link });
  rememberTempMessage(ctx, message);
}

const cancelRow = (ctx: IStepContext<ExtraSceneState>) => [
  Keyboard.button.callback(ctx.i18n.t('button.cancel'), 'scene:cancel'),
];

const languageKeyboard = (ctx: IStepContext<ExtraSceneState>) => {
  const { language } = ctx.scene.state;

  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(
        checked(language === 'ru', ctx.i18n.t('scene.extra.language.ru')),
        'extra:lang:ru',
      ),
      Keyboard.button.callback(
        checked(language === 'en', ctx.i18n.t('scene.extra.language.en')),
        'extra:lang:en',
      ),
    ],
    [
      Keyboard.button.callback(
        ctx.i18n.t('button.next'),
        'extra:next:language',
      ),
    ],
    cancelRow(ctx),
  ]);
};

const frequencyKeyboard = (ctx: IStepContext<ExtraSceneState>) => {
  const { frequency } = ctx.scene.state;

  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(
        checked(
          frequency === 'daily',
          ctx.i18n.t('scene.extra.frequency.daily'),
        ),
        'extra:frequency:daily',
      ),
      Keyboard.button.callback(
        checked(
          frequency === 'weekly',
          ctx.i18n.t('scene.extra.frequency.weekly'),
        ),
        'extra:frequency:weekly',
      ),
    ],
    [
      Keyboard.button.callback(
        ctx.i18n.t('button.back'),
        'extra:back:language',
      ),
      Keyboard.button.callback(
        ctx.i18n.t('button.next'),
        'extra:next:frequency',
      ),
    ],
    cancelRow(ctx),
  ]);
};

const noteKeyboard = (ctx: IStepContext<ExtraSceneState>) =>
  Keyboard.inlineKeyboard([
    compact([
      Keyboard.button.callback(
        ctx.i18n.t('button.back'),
        'extra:back:frequency',
      ),
      ctx.scene.state.note
        ? Keyboard.button.callback(ctx.i18n.t('button.next'), 'extra:next:note')
        : undefined,
    ]),
    cancelRow(ctx),
  ]);

const confirmKeyboard = (ctx: IStepContext<ExtraSceneState>) =>
  Keyboard.inlineKeyboard([
    [Keyboard.button.callback(ctx.i18n.t('button.save'), 'extra:confirm')],
    [Keyboard.button.callback(ctx.i18n.t('button.back'), 'extra:back:note')],
    cancelRow(ctx),
  ]);

const ensureDialogAvailable = async (ctx: IStepContext<ExtraSceneState>) => {
  if (
    (ctx.chatType !== 'dialog' && ctx.updateType !== 'bot_started') ||
    !ctx.user ||
    ctx.user.is_bot
  ) {
    // Callback нужно закрыть уведомлением, иначе клиент будет ждать ответ на кнопку.
    if (ctx.updateType === 'message_callback') {
      await ctx.answerOnCallback({
        notification: ctx.i18n.t('scene.extra.dialogOnly'),
      });
    }

    await ctx.scene.leave({ silent: true, canceled: true });
    return false;
  }

  return true;
};

const languageStep = new Composer<IStepContext<ExtraSceneState>>();
languageStep.action(/extra:lang:(ru|en)/, async (ctx) => {
  const language = ctx.match![1] as NonNullable<ExtraSceneState['language']>;
  ctx.scene.state.language = language;

  // Показываем смену языка прямо внутри scene.
  // При useSession=true выбранная локаль сохранится в session после middleware-chain.
  ctx.i18n.locale(language);

  await renderSceneMessage(
    ctx,
    ctx.i18n.t('scene.extra.chooseLanguage'),
    languageKeyboard(ctx),
  );
});
languageStep.action('extra:next:language', async (ctx) => {
  if (!ctx.scene.state.language) {
    await notifyCallback(ctx, ctx.i18n.t('scene.extra.pickLanguageFirst'));
    return;
  }

  await ctx.scene.step.next();
});
languageStep.use(async (ctx) => {
  await renderSceneMessage(
    ctx,
    ctx.i18n.t('scene.extra.chooseLanguage'),
    languageKeyboard(ctx),
  );
});

const frequencyStep = new Composer<IStepContext<ExtraSceneState>>();
frequencyStep.action(/extra:frequency:(daily|weekly)/, async (ctx) => {
  ctx.scene.state.frequency = ctx.match![1] as NonNullable<
    ExtraSceneState['frequency']
  >;

  await renderSceneMessage(
    ctx,
    ctx.i18n.t('scene.extra.chooseFrequency'),
    frequencyKeyboard(ctx),
  );
});
frequencyStep.action('extra:back:language', async (ctx) => {
  await ctx.scene.step.go(0);
});
frequencyStep.action('extra:next:frequency', async (ctx) => {
  if (!ctx.scene.state.frequency) {
    await notifyCallback(ctx, ctx.i18n.t('scene.extra.pickFrequencyFirst'));
    return;
  }

  await ctx.scene.step.next();
});
frequencyStep.use(async (ctx) => {
  await renderSceneMessage(
    ctx,
    ctx.i18n.t('scene.extra.chooseFrequency'),
    frequencyKeyboard(ctx),
  );
});

const noteStep = new Composer<IStepContext<ExtraSceneState>>();
noteStep.action('extra:back:frequency', async (ctx) => {
  await ctx.scene.step.go(1);
});
noteStep.action('extra:next:note', async (ctx) => {
  if (!ctx.scene.state.note) {
    await notifyCallback(ctx, ctx.i18n.t('scene.extra.noteRequired'));
    return;
  }

  await ctx.scene.step.next();
});
noteStep.on('message_created', async (ctx, next) => {
  const text = ctx.message?.body?.text?.trim();
  if (!text || text.startsWith('/')) return next();

  ctx.scene.state.note = text;
  ctx.scene.state.noteMid = ctx.message.body.mid;
  await ctx.scene.step.next();
});
noteStep.use(async (ctx) => {
  const { note } = ctx.scene.state;

  await renderSceneMessage(
    ctx,
    note
      ? ctx.i18n.t('scene.extra.writeNoteAgain', { note })
      : ctx.i18n.t('scene.extra.writeNote'),
    noteKeyboard(ctx),
  );
});

const confirmStep = new Composer<IStepContext<ExtraSceneState>>();
confirmStep.action('extra:back:note', async (ctx) => {
  await ctx.scene.step.go(2);
});
confirmStep.action('extra:confirm', async (ctx) => {
  const {
    language = 'ru',
    frequency = 'daily',
    note = '',
    noteMid,
  } = ctx.scene.state;

  // Сохраняем итог extra-сцены в общую session, чтобы показать связь scene -> session.
  ctx.session.extraSettings = { language, frequency, note };
  ctx.i18n.locale(language);

  if (ctx.updateType === 'message_callback') {
    const keepMid = ctx.message?.body.mid;
    await ctx.answerOnCallback({
      message: {
        text: ctx.i18n.t('scene.extra.saved'),
        ...(noteMid && { link: { type: 'reply' as const, mid: noteMid } }),
      },
    });
    await cleanupTempMessages(ctx, { keepMid });
  } else {
    await cleanupTempMessages(ctx);
    await ctx.reply(ctx.i18n.t('scene.extra.saved'), {
      ...(noteMid && { link: { type: 'reply' as const, mid: noteMid } }),
    });
  }

  await ctx.scene.leave({ silent: true });
});
confirmStep.use(async (ctx) => {
  const {
    language = 'ru',
    frequency = 'daily',
    note = '',
    noteMid,
  } = ctx.scene.state;

  await renderSceneMessage(
    ctx,
    ctx.i18n.t('scene.extra.confirm', { language, frequency, note }),
    confirmKeyboard(ctx),
    noteMid ? { type: 'reply', mid: noteMid } : undefined,
  );
});

export const extraScene = new StepScene<IStepContext>(SceneType.Extra, {
  enterHandler: async (ctx) => {
    if (!(await ensureDialogAvailable(ctx))) return;

    if (ctx.scene.step.firstTime) {
      await renderSceneMessage(ctx, ctx.i18n.t('scene.extra.started'));
    }
  },
  leaveHandler: async (ctx) => {
    if (ctx.scene.canceled) {
      await cleanupTempMessages(ctx);
      await ctx.reply(ctx.i18n.t('scene.cancelled'));
    }
  },
  steps: [
    languageStep.middleware(),
    frequencyStep.middleware(),
    noteStep.middleware(),
    confirmStep.middleware(),
  ] as StepSceneHandler<IStepContext>[],
});
