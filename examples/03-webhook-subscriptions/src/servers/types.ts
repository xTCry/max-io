import type { Bot } from 'max-io';

export type WebhookServerMode = 'builtin' | 'custom';

export type WebhookServerRunner = {
  mode: WebhookServerMode;
  start: (bot: Bot) => Promise<void>;
  stop: () => void;
};
