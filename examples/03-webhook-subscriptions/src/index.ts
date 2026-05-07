import 'dotenv/config';

import { Bot } from 'max-io';
import type { Api } from 'max-io';

import { createInterface } from 'node:readline/promises';

import {
  token,
  webhookAutoSubscribe,
  webhookDeletePrevious,
  webhookPath,
  webhookPort,
  webhookPublicUrl,
  webhookSecret,
  webhookServerMode,
  webhookUpdateTypes,
} from './env';
import { createWebhookServerRunner } from './servers';

type Command = 'server' | 'get-subs' | 'subscribe' | 'unsubscribe';

const commands: { name: Command; description: string }[] = [
  { name: 'server', description: 'Запустить локальный webhook receiver' },
  { name: 'get-subs', description: 'Получить список WebHook-подписок' },
  { name: 'subscribe', description: 'Подписать бота на WebHook URL' },
  { name: 'unsubscribe', description: 'Удалить WebHook-подписку по URL' },
];

const command = process.argv[2] as Command | undefined;

const printHelp = () => {
  console.log('Доступные команды:');
  for (const item of commands) {
    console.log(`- yarn ${item.name} — ${item.description}`);
  }
  console.log('');
  console.log('Для запуска через общий script:');
  console.log('yarn start get-subs');
};

const parseCommand = (value: Command | undefined): Command => {
  if (value && commands.some((item) => item.name === value)) return value;
  printHelp();
  process.exit(1);
};

const formatResult = (title: string, value: unknown) => {
  console.log(`\n${title}`);
  console.dir(value, { depth: 10 });
};

const createSubscribeRequest = () => {
  return {
    url: webhookPublicUrl,
    ...(webhookUpdateTypes ? { update_types: webhookUpdateTypes } : {}),
    ...(webhookSecret ? { secret: webhookSecret } : {}),
  };
};

const listSubscriptions = async (api: Api) => {
  const result = await api.getSubscriptions();
  formatResult('subscriptions:', result);
  return result;
};

const subscribeWebhook = async (api: Api) => {
  const request = createSubscribeRequest();
  formatResult('subscribe request:', request);
  const result = await api.subscribe(request);
  formatResult('subscribe result:', result);
  return result;
};

const unsubscribeWebhook = async (api: Api) => {
  console.log(`unsubscribe url: ${webhookPublicUrl}`);
  const result = await api.unsubscribe(webhookPublicUrl);
  formatResult('unsubscribe result:', result);
  return result;
};

const deletePreviousWebhooks = async (api: Api, exceptUrl?: string) => {
  const { subscriptions } = await api.getSubscriptions();

  for (const { url } of subscriptions) {
    if (url === exceptUrl) continue;

    console.log(`delete previous webhook: ${url}`);
    await api.unsubscribe(url);
  }
};

const printConsoleHelp = () => {
  console.log('');
  console.log('Интерактивные команды:');
  console.log('- help — показать список команд');
  console.log('- list — получить текущие WebHook-подписки');
  console.log('- subscribe — создать или обновить подписку из .env');
  console.log('- unsubscribe — удалить подписку по MAX_WEBHOOK_URL');
  console.log('- exit — остановить сервер');
};

const startInteractiveConsole = (api: Api, close: () => void) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let isClosed = false;

  const closeOnce = () => {
    if (isClosed) return;

    isClosed = true;
    rl.close();
    close();
  };

  rl.on('SIGINT', () => {
    console.log('\nОстановка сервера...');
    closeOnce();
  });

  const loop = async () => {
    printConsoleHelp();

    while (!isClosed) {
      try {
        const input = (await rl.question('\nwebhook> ')).trim();

        if (!input) {
          continue;
        }
        if (input === 'help') {
          printConsoleHelp();
          continue;
        }
        if (input === 'list') {
          await listSubscriptions(api);
          continue;
        }
        if (input === 'subscribe') {
          await subscribeWebhook(api);
          continue;
        }
        if (input === 'unsubscribe') {
          await unsubscribeWebhook(api);
          continue;
        }
        if (input === 'exit') {
          closeOnce();
          break;
        }

        console.log(
          `Неизвестная команда: ${input}\nИспользуй help для списка команд`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          closeOnce();
          break;
        }

        console.error(error);
      }
    }
  };

  void loop();
};

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === 'AbortError';
};

const registerBotHandlers = (bot: Bot) => {
  bot.command('help', async (ctx) => {
    return ctx.reply(
      [
        'Webhook example работает через middleware.',
        'Команды:',
        '/help — показать подсказку',
        '/ping — проверить ответ через webhook',
      ].join('\n'),
    );
  });

  bot.command('ping', async (ctx) => {
    return ctx.reply('pong from webhook middleware');
  });

  bot.on('message_created', async (ctx, next) => {
    console.log('\nWebhook middleware update');
    console.log(`type: ${ctx.updateType}`);
    console.log(`text: ${ctx.message?.body?.text ?? ''}`);

    if (ctx.message?.body?.text?.startsWith('/')) {
      return next();
    }

    return ctx.reply('Webhook получил сообщение. Используй /help или /ping.');
  });
};

const runServer = async (bot: Bot) => {
  registerBotHandlers(bot);
  const runner = createWebhookServerRunner();

  await runner.start(bot);

  if (runner.mode === 'custom' && webhookAutoSubscribe) {
    if (webhookDeletePrevious) {
      await deletePreviousWebhooks(bot.api, webhookPublicUrl);
    }

    await subscribeWebhook(bot.api);
  }

  console.log('Webhook receiver started');
  console.log(`mode: ${webhookServerMode}`);
  console.log(
    `local: http://localhost:${webhookPort}${webhookPath ?? ' <auto>'}`,
  );
  console.log(`public: ${webhookPublicUrl}`);
  console.log(`secret check: ${webhookSecret ? 'enabled' : 'disabled'}`);
  console.log(
    `auto subscribe: ${webhookAutoSubscribe ? 'enabled' : 'disabled'}`,
  );
  console.log(
    `delete previous: ${webhookDeletePrevious ? 'enabled' : 'disabled'}`,
  );

  await listSubscriptions(bot.api);
  startInteractiveConsole(bot.api, () => runner.stop());
};

const main = async () => {
  const activeCommand = parseCommand(command);

  const bot = new Bot(token);

  if (activeCommand === 'server') {
    await runServer(bot);
    return;
  }

  switch (activeCommand) {
    case 'get-subs': {
      await listSubscriptions(bot.api);
      break;
    }

    case 'subscribe': {
      await subscribeWebhook(bot.api);
      break;
    }

    case 'unsubscribe': {
      await unsubscribeWebhook(bot.api);
      break;
    }
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
