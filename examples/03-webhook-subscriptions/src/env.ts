import type { UpdateType } from 'max-io/types';

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

export const token = readRequiredEnv('MAX_BOT_TOKEN');

export const webhookUrl = readRequiredEnv('MAX_WEBHOOK_URL');

export const webhookPort = readIntegerEnv('MAX_WEBHOOK_PORT', 3000);

export const webhookPath =
  process.env.MAX_WEBHOOK_PATH?.trim() || '/max-webhook';

export const webhookSecret =
  process.env.MAX_WEBHOOK_SECRET?.trim() || undefined;

export const webhookUpdateTypes = parseUpdateTypes(
  process.env.MAX_WEBHOOK_UPDATE_TYPES,
);

export const webhookAutoSubscribe = readBooleanEnv(
  'MAX_WEBHOOK_AUTO_SUBSCRIBE',
  true,
);
