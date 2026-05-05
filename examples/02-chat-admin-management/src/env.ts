const readRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const readIntegerEnv = (name: string) => {
  const value = Number(readRequiredEnv(name));
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
};

export const token = readRequiredEnv('MAX_BOT_TOKEN');

export const chatId = readIntegerEnv('MAX_ADMIN_CHAT_ID');

export const userId = readIntegerEnv('MAX_ADMIN_USER_ID');

export const permissions = (
  process.env.MAX_ADMIN_PERMISSIONS ??
  'read_all_messages,add_remove_members,write'
)
  .split(',')
  .map((permission) => permission.trim())
  .filter(Boolean);

export const alias = process.env.MAX_ADMIN_ALIAS?.trim() || undefined;

export const confirmDeleteChat =
  process.env.MAX_ADMIN_CONFIRM_DELETE_CHAT === 'true';
