import { webhookServerMode } from '../env';
import { createBuiltinServerRunner } from './builtin';
import { createCustomServerRunner } from './custom';
import type { WebhookServerRunner } from './types';

export const createWebhookServerRunner = (): WebhookServerRunner =>
  webhookServerMode === 'custom'
    ? createCustomServerRunner()
    : createBuiltinServerRunner();
