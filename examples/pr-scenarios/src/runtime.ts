import { type Bot, type Context } from 'max-io';

type ScenarioCommand = {
  name: string;
  description?: string | null;
};

type ScenarioRuntimeOptions = {
  scenarioName: string;
  commands: ScenarioCommand[];
  beforeStart?: () => Promise<void>;
  fallbackTitle?: string;
  fallbackLines?: string[];
  shouldReplyToFallback?: (ctx: Context) => boolean | Promise<boolean>;
  onStop?: () => void;
};

const isTextCommand = (ctx: Context) => {
  const text = ctx.message?.body?.text?.trim();
  return Boolean(text && text.startsWith('/'));
};

const formatCommands = (commands: ScenarioCommand[]) => {
  if (commands.length === 0) {
    return ['У этого сценария нет slash-команд.'];
  }

  return [
    'Доступные команды:',
    ...commands.map((command) => {
      const suffix = command.description ? ` — ${command.description}` : '';
      return `/${command.name}${suffix}`;
    }),
  ];
};

const formatFallbackText = ({
  scenarioName,
  commands,
  fallbackTitle,
  fallbackLines,
}: ScenarioRuntimeOptions) => {
  return [
    fallbackTitle ?? `Сценарий: ${scenarioName}`,
    ...formatCommands(commands),
    ...(fallbackLines ?? []),
  ].join('\n');
};

export const syncScenarioCommands = async (
  bot: Bot,
  commands: ScenarioCommand[],
) => {
  if (commands.length === 0) {
    await bot.api.deleteMyCommands();
    return;
  }

  await bot.api.setMyCommands(commands);
};

export const registerScenarioFallback = (
  bot: Bot,
  options: ScenarioRuntimeOptions,
) => {
  const helpText = formatFallbackText(options);

  bot.on('message_created', async (ctx, next) => {
    if (!ctx.message?.body?.text?.trim()) return next();
    if (isTextCommand(ctx)) return next();

    const shouldReply = await (options.shouldReplyToFallback?.(ctx) ?? true);
    if (!shouldReply) return next();

    return ctx.reply(helpText);
  });
};

export const startScenarioBot = (
  bot: Bot,
  {
    scenarioName,
    commands,
    beforeStart,
    fallbackTitle,
    fallbackLines,
    onStop,
  }: ScenarioRuntimeOptions,
) => {
  let isStopping = false;

  bot.catch((error, ctx) => {
    console.error(
      `[${scenarioName}] Необработанная ошибка на update ${ctx.updateType}`,
      error,
    );
  });

  const stopBot = (signal: string) => {
    if (isStopping) return;
    isStopping = true;
    console.log(`[${scenarioName}] Получен ${signal}, останавливаю бота.`);
    onStop?.();
    bot.stop();
  };

  process.once('SIGINT', () => stopBot('SIGINT'));
  process.once('SIGTERM', () => stopBot('SIGTERM'));

  void (async () => {
    console.log(`[${scenarioName}] Инициализация бота...`);

    await beforeStart?.();

    bot.botInfo ??= await bot.api.getMyInfo();

    const botName = bot.botInfo.username
      ? `@${bot.botInfo.username}`
      : `id=${bot.botInfo.user_id}`;

    console.log(`[${scenarioName}] Бот ${botName} инициализирован.`);
    console.log(
      `[${scenarioName}] ${fallbackTitle ?? `Сценарий: ${scenarioName}`}`,
    );

    for (const line of formatCommands(commands)) {
      console.log(`[${scenarioName}] ${line}`);
    }

    for (const line of fallbackLines ?? []) {
      console.log(`[${scenarioName}] ${line}`);
    }

    console.log(`[${scenarioName}] Запускаю long polling...`);
    await bot.start();
  })().catch((error) => {
    console.error(`[${scenarioName}] Ошибка запуска бота`, error);
    process.exitCode = 1;
  });
};
