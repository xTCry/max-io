import { publicPath } from './paths';

const rawToken = process.env.MAX_BOT_TOKEN;

if (!rawToken) {
  throw new Error('MAX_BOT_TOKEN is not set');
}

export const token: string = rawToken;

export const uploadVideoPath =
  process.env.MAX_UPLOAD_PROGRESS_VIDEO_PATH ?? `${publicPath}/video.mp4`;

export const uploadAudioPath =
  process.env.MAX_UPLOAD_PROGRESS_AUDIO_PATH ?? `${publicPath}/audio.mp3`;

export const uploadFilePath =
  process.env.MAX_UPLOAD_PROGRESS_FILE_PATH ?? `${publicPath}/video.mp4`;

export const uploadImagePath =
  process.env.MAX_UPLOAD_PROGRESS_IMAGE_PATH ?? `${publicPath}/image.png`;

const rawTimeout = process.env.MAX_UPLOAD_PROGRESS_TIMEOUT;

export const uploadTimeout =
  rawTimeout === undefined ? 60_000 : Number(rawTimeout);

if (!Number.isFinite(uploadTimeout) || uploadTimeout <= 0) {
  throw new Error('MAX_UPLOAD_PROGRESS_TIMEOUT must be a positive number');
}
