import type { Bot } from 'max-io';

import {
  webhookAutoSubscribe,
  webhookDeletePrevious,
  webhookPath,
  webhookPort,
  webhookPublicUrl,
  webhookSecret,
  webhookUpdateTypes,
} from '../env';
import type { WebhookServerRunner } from './types';

export const createBuiltinServerRunner = (): WebhookServerRunner => ({
  mode: 'builtin',
  start: async (bot: Bot) => {
    activeBot = bot;

    await bot.start({
      allowedUpdates: webhookUpdateTypes,
      webhook: {
        domain: webhookPublicUrl,
        port: webhookPort,
        secret: webhookSecret,
        subscribe: webhookAutoSubscribe,
        deletePreviousWebhooks: webhookDeletePrevious,
        ...(webhookPath ? { path: webhookPath } : {}),
      },
    });
  },
  stop: () => {
    activeBot?.stop();
    activeBot = undefined;
  },
});

let activeBot: Bot | undefined;
