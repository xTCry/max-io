import 'dotenv/config';

import { Bot, DEFAULT_API_BASE_URL, MaxError } from 'max-io';

import { token } from './env';

const scenarioName = '50-schema-compatibility-smoke';
const api2BaseUrl = 'https://platform-api2.max.ru';
const rawChatLink =
  process.env.MAX_SCHEMA_SMOKE_CHAT_LINK ?? 'https://max.ru/max_news';
const chatLink = normalizeChatLink(rawChatLink);

type CheckResult = {
  baseUrl: string;
  success: boolean;
};

void run().catch((error: unknown) => {
  console.error(`[${scenarioName}] UNEXPECTED_ERROR`, error);
  process.exitCode = 1;
});

async function run() {
  console.log(`[${scenarioName}] Проверяю getChatByLink("${chatLink}").`);

  const results = await Promise.all([
    checkGetChatByLink(DEFAULT_API_BASE_URL),
    checkGetChatByLink(api2BaseUrl),
  ]);

  if (results.every((result) => !result.success)) {
    console.error(
      `[${scenarioName}] Метод не подтвердился ни на одном проверенном endpoint.`,
    );
    process.exitCode = 1;
  }
}

async function checkGetChatByLink(baseUrl: string): Promise<CheckResult> {
  const bot = new Bot(token, { apiBaseUrl: baseUrl });

  console.log(`[${scenarioName}] REQUEST | baseUrl=${baseUrl}`);

  try {
    const chat = await bot.api.getChatByLink(chatLink);

    console.log(
      [
        `[${scenarioName}] SUCCESS`,
        `baseUrl=${baseUrl}`,
        `chatId=${chat.chat_id}`,
        `type=${chat.type}`,
        `title=${JSON.stringify(chat.title)}`,
        `link=${JSON.stringify(chat.link)}`,
      ].join(' | '),
    );
    console.dir(chat, { depth: 6 });

    return { baseUrl, success: true };
  } catch (error) {
    if (error instanceof MaxError) {
      console.error(
        [
          `[${scenarioName}] API_ERROR`,
          `baseUrl=${baseUrl}`,
          `status=${error.status}`,
          `code=${error.code}`,
          `message=${error.description}`,
        ].join(' | '),
      );
    } else {
      console.error(
        `[${scenarioName}] REQUEST_ERROR | baseUrl=${baseUrl}`,
        error,
      );
    }

    return { baseUrl, success: false };
  }
}

/**
 * Принимает username, @username или публичную ссылку Max и возвращает chat_link для API.
 */
function normalizeChatLink(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('MAX_SCHEMA_SMOKE_CHAT_LINK must not be empty');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const url = new URL(trimmed);
    const link = url.pathname.split('/').filter(Boolean).at(-1);

    if (!link) {
      throw new Error(
        'MAX_SCHEMA_SMOKE_CHAT_LINK URL must contain a channel username',
      );
    }

    return link;
  }

  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}
