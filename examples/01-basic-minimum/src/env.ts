const rawToken = process.env.MAX_BOT_TOKEN;

if (!rawToken) {
  throw new Error('MAX_BOT_TOKEN is not set');
}

export const token: string = rawToken;

export const imageUrl =
  process.env.MAX_IMAGE_URL ??
  'https://uploads.dailydot.com/2024/06/crying-cat-thumb.jpg?q=65&auto=format&w=1600&ar=2:1&fit=crop';

export const imageToken = process.env.MAX_IMAGE_TOKEN;

export const stickerCode = process.env.MAX_STICKER_CODE ?? '34bd4fbb';
