import type { UpdateType } from 'max-io/types';

import type { WebhookServerMode } from './servers/types';

const readRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const readIntegerEnv = (name: string, fallback: number) => {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be an integer`);
  }

  return parsed;
};

const readBooleanEnv = (name: string, fallback: boolean) => {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
};

const parseUpdateTypes = (
  value: string | undefined,
): UpdateType[] | undefined => {
  const items = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items?.length ? (items as UpdateType[]) : undefined;
};

const readWebhookServerMode = (): WebhookServerMode => {
  const value = process.env.MAX_WEBHOOK_SERVER_MODE?.trim() || 'builtin';

  if (value === 'builtin' || value === 'custom') return value;

  throw new Error('MAX_WEBHOOK_SERVER_MODE must be builtin or custom');
};

const readWebhookPath = () => {
  const value = process.env.MAX_WEBHOOK_PATH?.trim();
  if (!value) return undefined;
  if (value.startsWith('/')) return value;

  throw new Error('MAX_WEBHOOK_PATH must start with /');
};

const readWebhookSecret = () => {
  const value = process.env.MAX_WEBHOOK_SECRET?.trim();
  if (!value) return undefined;

  if (/^[A-Za-z0-9-]{5,256}$/.test(value)) return value;

  throw new Error('MAX_WEBHOOK_SECRET must be 5-256 chars: A-Z, a-z, 0-9 or -');
};

const buildWebhookPublicUrl = (domainOrUrl: string, path?: string) => {
  const url = new URL(
    domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`,
  );
  if (path) url.pathname = path;
  url.search = '';
  url.hash = '';

  return url.toString();
};

export const token = readRequiredEnv('MAX_BOT_TOKEN');

export const webhookUrl = readRequiredEnv('MAX_WEBHOOK_URL');

export const webhookPort = readIntegerEnv('MAX_WEBHOOK_PORT', 3000);

export const webhookPath = readWebhookPath();

export const webhookSecret = readWebhookSecret();

export const webhookPublicUrl = buildWebhookPublicUrl(webhookUrl, webhookPath);

export const webhookUpdateTypes = parseUpdateTypes(
  process.env.MAX_WEBHOOK_UPDATE_TYPES,
);

export const webhookAutoSubscribe = readBooleanEnv(
  'MAX_WEBHOOK_AUTO_SUBSCRIBE',
  true,
);

export const webhookDeletePrevious = readBooleanEnv(
  'MAX_WEBHOOK_DELETE_PREVIOUS',
  true,
);

export const webhookServerMode = readWebhookServerMode();
