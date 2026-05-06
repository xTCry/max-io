import 'dotenv/config';

import { Bot } from 'max-io';
import type { Api } from 'max-io';
import type { Update } from 'max-io/types';

import { createServer } from 'node:http';
import { createInterface } from 'node:readline/promises';

import {
  token,
  webhookAutoSubscribe,
  webhookPath,
  webhookPort,
  webhookSecret,
  webhookUpdateTypes,
  webhookUrl,
} from './env';

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

const readRequestBody = async (request: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
};

const formatResult = (title: string, value: unknown) => {
  console.log(`\n${title}`);
  console.dir(value, { depth: 10 });
};

const createSubscribeRequest = () => {
  return {
    url: webhookUrl,
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
  console.log(`unsubscribe url: ${webhookUrl}`);
  const result = await api.unsubscribe(webhookUrl);
  formatResult('unsubscribe result:', result);
  return result;
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

  const loop = async () => {
    printConsoleHelp();

    while (true) {
      const input = (await rl.question('\nwebhook> ')).trim();

      try {
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
          rl.close();
          close();
          break;
        }

        console.log(
          `Неизвестная команда: ${input}\nИспользуй help для списка команд`,
        );
      } catch (error) {
        console.error(error);
      }
    }
  };

  void loop();
};

const runServer = (api: Api) => {
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== webhookPath) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'not_found' }));
      return;
    }

    const requestSecret = request.headers['x-max-bot-api-secret'];
    if (webhookSecret && requestSecret !== webhookSecret) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'invalid_secret' }));
      return;
    }

    const rawBody = await readRequestBody(request);
    const update = JSON.parse(rawBody) as Update;

    console.log('\nWebhook update received');
    console.log(`type: ${update.update_type}`);
    console.dir(update, { depth: 10 });

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });

  server.listen(webhookPort, () => {
    console.log('Webhook receiver started');
    console.log(`local: http://localhost:${webhookPort}${webhookPath}`);
    console.log(`public: ${webhookUrl}`);
    console.log(`secret check: ${webhookSecret ? 'enabled' : 'disabled'}`);

    const bootstrap = async () => {
      await listSubscriptions(api);
      if (webhookAutoSubscribe) {
        await subscribeWebhook(api);
      } else {
        console.log('\nauto subscribe disabled');
      }
      startInteractiveConsole(api, () => server.close());
    };

    void bootstrap().catch((error) => {
      console.error(error);
      startInteractiveConsole(api, () => server.close());
    });
  });
};

const main = async () => {
  const activeCommand = parseCommand(command);

  const bot = new Bot(token);

  if (activeCommand === 'server') {
    runServer(bot.api);
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
