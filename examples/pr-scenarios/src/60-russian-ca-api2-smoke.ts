import 'dotenv/config';

import { Bot, DEFAULT_API_BASE_URL } from 'max-io';

import { token } from './env';

const scenarioName = '60-russian-ca-api2-smoke';

const main = async (): Promise<void> => {
  const bot = new Bot(token);

  console.log(`[${scenarioName}] REQUEST | baseUrl=${DEFAULT_API_BASE_URL}`);
  console.log(
    `[${scenarioName}] Russian CA fallback is enabled only for platform-api2.max.ru`,
  );

  const info = await bot.api.getMyInfo();

  console.log(
    `[${scenarioName}] SUCCESS | botId=${info.user_id} | username=@${info.username}`,
  );
};

main().catch((error: unknown) => {
  console.error(`[${scenarioName}] FAIL`, error);
  process.exitCode = 1;
});
