import 'dotenv/config';

import { Bot, MaxError } from 'max-io';

import { token } from './env';

const scenarioName = '60-comments-api-smoke';
const postId = process.env.MAX_COMMENTS_POST_ID;

void run().catch((error: unknown) => {
  console.error(`[${scenarioName}] UNEXPECTED_ERROR`, error);
  process.exitCode = 1;
});

async function run() {
  if (!postId) {
    throw new Error(
      'Укажите MAX_COMMENTS_POST_ID=mid... поста из канала с включёнными комментариями.',
    );
  }

  const bot = new Bot(token);

  console.log(`[${scenarioName}] Получаю комментарии к посту ${postId}.`);

  try {
    const page = await bot.api.getComments(postId, { count: 10 });

    console.log(
      `[${scenarioName}] SUCCESS | comments=${page.messages.length}`,
    );
    console.dir(page, { depth: 6 });
  } catch (error) {
    if (error instanceof MaxError) {
      console.error(
        [
          `[${scenarioName}] API_ERROR`,
          `status=${error.status}`,
          `code=${error.code}`,
          `message=${error.description}`,
        ].join(' | '),
      );
      return;
    }

    throw error;
  }
}
