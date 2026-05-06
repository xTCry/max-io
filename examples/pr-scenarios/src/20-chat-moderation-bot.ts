import 'dotenv/config';

import { Bot, Keyboard } from 'max-io';
import type { Context } from 'max-io';

import { token } from './env';
import {
  registerScenarioFallback,
  startScenarioBot,
  syncScenarioCommands,
} from './runtime';

type ModerationTarget = {
  userId: number;
  label: string;
};

type ParsedTarget =
  | { kind: 'id'; userId: number; rest: string }
  | { kind: 'username'; username: string; rest: string }
  | { kind: 'none'; rest: string };

// AddChatMembersResponse
type InviteResultDetails = Awaited<
  ReturnType<Context['api']['addChatMembers']>
>;

const scenarioName = 'chat-moderation-bot';
const usernameLookupLimit = Number(
  process.env.MAX_MODERATION_USERNAME_LOOKUP_LIMIT ?? 300,
);

const commands = [
  { name: 'help', description: 'Показать команды модерации' },
  { name: 'kick', description: 'Удалить участника без блокировки' },
  { name: 'ban', description: 'Заблокировать участника' },
  { name: 'invite', description: 'Попробовать пригласить участника обратно' },
  {
    name: 'unban',
    description: 'Alias для invite: попробовать вернуть участника',
  },
];

const bot = new Bot(token);

/* bot.use(async (ctx, next) => {
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (_key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return;
        seen.add(value);
      }
      return value;
    };
  };
  const res = await next();
  const ctxObj = JSON.parse(JSON.stringify(ctx, getCircularReplacer()));
  delete ctxObj['api'];
  console.dir({ ctxObj }, { depth: 8 });
  return res;
}); */

const shouldReplyToModerationFallback = (ctx: Context) => {
  const text = ctx.message?.body.text?.trim();
  const username = ctx.botInfo?.username;

  return Boolean(text && username && text.includes(`@${username}`));
};

const helpText = [
  'Команды модерации:',
  '/help — показать эту подсказку',
  '/kick 123456 причина — удалить пользователя по ID без блокировки',
  '/kick @username причина — найти участника по username и удалить без блокировки',
  '/kick причина — удалить автора reply/forward-сообщения без блокировки',
  '/ban 123456 причина — заблокировать пользователя по ID',
  '/ban @username причина — найти участника по username и заблокировать',
  '/ban причина — заблокировать автора reply/forward-сообщения',
  '/invite 123456 — попробовать пригласить пользователя обратно',
  '/unban 123456 — то же самое, что /invite',
  '',
  'Важно: block=true работает как ban. Отдельного API для гарантированного unban пока не найдено.',
].join('\n');

const isPositiveInteger = (value: number) => {
  return Number.isSafeInteger(value) && value > 0;
};

const isChatId = (value: number) => {
  return Number.isSafeInteger(value) && value !== 0;
};

const formatError = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

const getActorId = (ctx: Context) => {
  return ctx.user?.user_id ?? ctx.sender?.user_id;
};

const assertChatCommand = async (ctx: Context) => {
  if (
    ctx.chatId === undefined ||
    ctx.chatId === null ||
    ctx.chatType !== 'chat'
  ) {
    await ctx.reply('Команды модерации работают только в групповом чате.');
    return false;
  }

  return true;
};

const isChatAdmin = async (ctx: Context, chatId: number, userId: number) => {
  const admins = await ctx.api.getChatAdmins(chatId);
  return admins.members.some((member) => {
    return member.user_id === userId && (member.is_admin || member.is_owner);
  });
};

const requireAdmin = async (ctx: Context, chatId: number) => {
  const actorId = getActorId(ctx);

  if (!actorId) {
    await ctx.reply(
      'Не удалось определить пользователя, который вызвал команду.',
    );
    return false;
  }

  try {
    const isAdmin = await isChatAdmin(ctx, chatId, actorId);
    if (!isAdmin) {
      await ctx.reply(
        'Команды модерации доступны только администраторам чата.',
      );
      return false;
    }
  } catch (error) {
    await ctx.reply(
      `Не удалось получить список администраторов: ${formatError(error)}`,
    );
    return false;
  }

  return true;
};

const parseTarget = (input: string): ParsedTarget => {
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'none', rest: '' };

  const [first = '', ...restParts] = trimmed.split(/\s+/);
  const rest = restParts.join(' ').trim();

  if (/^\d+$/.test(first)) {
    const userId = Number(first);
    if (isPositiveInteger(userId)) return { kind: 'id', userId, rest };
  }

  if (/^@[A-Za-z0-9_.-]{3,}$/.test(first)) {
    return { kind: 'username', username: first.slice(1).toLowerCase(), rest };
  }

  return { kind: 'none', rest: trimmed };
};

const getLinkedMessageTarget = (ctx: Context): ModerationTarget | undefined => {
  const linkedSender = ctx.message?.link?.sender;
  if (!linkedSender?.user_id) return undefined;

  return {
    userId: linkedSender.user_id,
    label: linkedSender.username
      ? `@${linkedSender.username}`
      : linkedSender.name,
  };
};

const findTargetByUsername = async (
  ctx: Context,
  chatId: number,
  username: string,
): Promise<ModerationTarget | undefined> => {
  let marker: number | undefined;
  let scanned = 0;

  while (scanned < usernameLookupLimit) {
    const count = Math.min(100, usernameLookupLimit - scanned);
    const result = await ctx.api.getChatMembers(chatId, { count, marker });
    const member = result.members.find((item) => {
      return item.username?.toLowerCase() === username;
    });

    if (member) {
      return { userId: member.user_id, label: `@${member.username}` };
    }

    scanned += result.members.length;
    if (!result.marker || result.members.length === 0) return undefined;
    marker = result.marker;
  }

  return undefined;
};

const resolveTarget = async (
  ctx: Context,
  chatId: number,
  input: string,
): Promise<{ target?: ModerationTarget; reason: string; error?: string }> => {
  const parsed = parseTarget(input);

  if (parsed.kind === 'id') {
    return {
      target: { userId: parsed.userId, label: `id=${parsed.userId}` },
      reason: parsed.rest,
    };
  }

  if (parsed.kind === 'username') {
    const target = await findTargetByUsername(ctx, chatId, parsed.username);
    return target
      ? { target, reason: parsed.rest }
      : {
          reason: parsed.rest,
          error: `Не нашёл @${parsed.username} среди первых ${usernameLookupLimit} участников чата. Лучше использовать user_id или reply.`,
        };
  }

  const linkedTarget = getLinkedMessageTarget(ctx);
  return linkedTarget
    ? { target: linkedTarget, reason: parsed.rest }
    : {
        reason: parsed.rest,
        error:
          'Не указан пользователь. Передай user_id, @username или ответь командой на сообщение пользователя.',
      };
};

const moderationKeyboard = (chatId: number, userId: number) => {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(
        'Попробовать вернуть',
        `moderation:invite:${chatId}:${userId}`,
      ),
    ],
  ]);
};

const formatInviteResult = (
  target: ModerationTarget,
  result: InviteResultDetails,
) => {
  if (result.success) {
    return `Инвайт для ${target.label} отправлен. Проверь результат в чате.`;
  }

  const errorCodes = result.failed_user_details
    ?.map((detail) => detail.error_code)
    .filter(Boolean)
    .join(', ');

  if (errorCodes?.includes('add.participant.privacy')) {
    return `Не удалось пригласить ${target.label}: пользователь запретил приглашения или нужен ручной invite админом.`;
  }

  return [
    `Не удалось пригласить ${target.label}.`,
    result.message && `Сообщение: ${result.message}`,
    errorCodes && `Коды ошибок: ${errorCodes}`,
    result.failed_user_ids?.length &&
      `failed_user_ids: ${result.failed_user_ids.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const runRemove = async (
  ctx: Context,
  rawArgs: string,
  options: { block: boolean; actionName: 'kick' | 'ban' },
) => {
  if (!(await assertChatCommand(ctx))) return;

  const chatId = ctx.chatId;
  if (chatId === undefined || chatId === null) return;
  if (!(await requireAdmin(ctx, chatId))) return;

  const { target, reason, error } = await resolveTarget(ctx, chatId, rawArgs);

  if (!target) {
    await ctx.reply(
      error ?? 'Не удалось определить пользователя для удаления.',
    );
    return;
  }

  if (target.userId === ctx.myId) {
    await ctx.reply('Не буду удалять самого себя.');
    return;
  }

  try {
    const result = await ctx.api.removeChatMember(chatId, target.userId, {
      block: options.block,
    });
    const reasonLine = reason ? `\nПричина: ${reason}` : '';
    const actionText = `${options.block ? 'заблокирован' : 'удалён из чата'}`;

    await ctx.reply(
      result.success
        ? `Пользователь ${target.label} ${actionText}.${reasonLine}`
        : `Ошибка: ${result.message}`,
      { attachments: [moderationKeyboard(chatId, target.userId)] },
    );

    console.log(`[${scenarioName}] ${options.actionName}`, {
      chatId,
      userId: target.userId,
      block: options.block,
      reason,
      result,
    });
  } catch (apiError) {
    const actionText = options.block ? 'заблокировать' : 'удалить';
    await ctx.reply(
      `Не удалось ${actionText} ${target.label}: ${formatError(apiError)}`,
    );
  }
};

const runInvite = async (ctx: Context, rawArgs: string) => {
  if (!(await assertChatCommand(ctx))) return;

  const chatId = ctx.chatId;
  if (chatId === undefined || chatId === null) return;
  if (!(await requireAdmin(ctx, chatId))) return;

  const { target, error } = await resolveTarget(ctx, chatId, rawArgs);

  if (!target) {
    await ctx.reply(error ?? 'Не удалось определить пользователя для инвайта.');
    return;
  }

  try {
    const result = await ctx.api.addChatMembers(chatId, [target.userId]);
    await ctx.reply(formatInviteResult(target, result));
    console.log(
      `[${scenarioName}] invite`,
      { chatId, userId: target.userId },
      result,
    );
  } catch (apiError) {
    await ctx.reply(
      `Не удалось пригласить ${target.label}: ${formatError(apiError)}`,
    );
  }
};

bot.command('help', async (ctx) => {
  if (!(await assertChatCommand(ctx))) return;

  const chatId = ctx.chatId;
  if (chatId === undefined || chatId === null) return;
  if (!(await requireAdmin(ctx, chatId))) return;

  await ctx.reply(helpText);
});

bot.command('kick', async (ctx) => {
  await runRemove(ctx, ctx.payload ?? '', {
    block: false,
    actionName: 'kick',
  });
});

bot.command('ban', async (ctx) => {
  await runRemove(ctx, ctx.payload ?? '', {
    block: true,
    actionName: 'ban',
  });
});

bot.command(['invite', 'unban'], async (ctx) => {
  await runInvite(ctx, ctx.payload ?? '');
});

bot.action(/^moderation:invite:(-?\d+):(\d+)$/i, async (ctx) => {
  const chatId = Number(ctx.match?.[1]);
  const userId = Number(ctx.match?.[2]);

  if (!isChatId(chatId) || !isPositiveInteger(userId)) {
    await ctx.answerOnCallback({
      notification: 'Некорректный payload кнопки.',
    });
    return;
  }

  if (!(await requireAdmin(ctx, chatId))) {
    await ctx.answerOnCallback({ notification: 'Недостаточно прав.' });
    return;
  }

  try {
    const result = await ctx.api.addChatMembers(chatId, [userId]);
    const notification = result.success
      ? 'Инвайт отправлен.'
      : 'Инвайт не сработал. Проверь сообщение/консоль.';
    await ctx.answerOnCallback({
      notification,
      message: result.success
        ? {
            // * Clear keyboard
            attachments: [],
          }
        : {},
    });
    console.log(`[${scenarioName}] invite:button`, { chatId, userId }, result);
  } catch (apiError) {
    await ctx.answerOnCallback({
      notification: `Ошибка: ${formatError(apiError)}`,
    });
  }
});

registerScenarioFallback(bot, {
  scenarioName,
  commands,
  fallbackTitle: 'Сценарий: бот модерации чата',
  shouldReplyToFallback: shouldReplyToModerationFallback,
  fallbackLines: [
    'Команды отвечают только администраторам группового чата.',
    'Fallback отвечает только на сообщения с упоминанием бота.',
    // `Поиск по username ограничен первыми ${usernameLookupLimit} участниками.`,
  ],
});

startScenarioBot(bot, {
  scenarioName,
  commands,
  beforeStart: () => syncScenarioCommands(bot, commands),
  fallbackTitle: 'Сценарий: бот модерации чата',
  fallbackLines: [
    'Добавь бота администратором и отправь /help в тестовом чате.',
    `Поиск по username ограничен первыми ${usernameLookupLimit} участниками.`,
  ],
});
