# 3. Вложения и загрузка файлов

В Max сообщение может содержать attachments: изображения, видео, аудио, файлы, стикеры, геолокацию, preview ссылки и клавиатуры. В `max-io` для отправляемых вложений есть helper-классы с методом `toJson()`.

## Готовый token

Если token уже есть, attachment можно создать напрямую:

```ts
import {
  AudioAttachment,
  FileAttachment,
  ImageAttachment,
  VideoAttachment,
} from 'max-io';

await ctx.reply('Изображение', {
  attachments: [new ImageAttachment({ token: 'image-token' }).toJson()],
});

await ctx.reply('Видео', {
  attachments: [new VideoAttachment({ token: 'video-token' }).toJson()],
});

await ctx.reply('Аудио', {
  attachments: [new AudioAttachment({ token: 'audio-token' }).toJson()],
});

await ctx.reply('Файл', {
  attachments: [new FileAttachment({ token: 'file-token' }).toJson()],
});
```

## Upload через `ctx.api`

Для новых файлов используйте upload helpers:

```ts
const image = await ctx.api.uploadImage({ source: './public/image.png' });
const video = await ctx.api.uploadVideo({ source: './public/video.mp4' });
const audio = await ctx.api.uploadAudio({ source: './public/audio.mp3' });
const file = await ctx.api.uploadFile({ source: './public/report.pdf' });

await ctx.reply('Готово', {
  attachments: [image.toJson(), video.toJson(), audio.toJson(), file.toJson()],
});
```

`source` может быть путём к файлу, `Buffer` или `ReadStream`.

## Изображение по URL

Для изображения можно передать URL без загрузки файла через upload endpoint:

```ts
const image = await ctx.api.uploadImage({
  url: 'https://example.com/image.png',
});

await ctx.reply('Картинка по URL', {
  attachments: [image.toJson()],
});
```

## Progress

`onProgress` получает фазу, режим загрузки, имя файла, загруженные байты и общий размер, если он известен.

```ts
const video = await ctx.api.uploadVideo({
  source: './public/video.mp4',
  timeout: 60_000,
  onProgress: ({ phase, mode, fileName, loaded, total }) => {
    const percent = total ? Math.round((loaded / total) * 100) : undefined;
    console.log({ phase, mode, fileName, percent });
  },
});

await ctx.reply('Видео загружено', {
  attachments: [video.toJson()],
});
```

## Отмена upload

```ts
const controller = new AbortController();

setTimeout(() => controller.abort(), 30_000);

await ctx.api.uploadFile({
  source: './public/archive.zip',
  signal: controller.signal,
});
```

Если нужно отменять загрузку командой пользователя, не блокируйте middleware ожиданием upload: запустите upload job в фоне, сохраните `AbortController` и обработайте команду отмены отдельно.

## `attachment.not.ready`

После upload сервер Max иногда ещё обрабатывает файл и временно отвечает `attachment.not.ready` при отправке сообщения. `max-io` повторяет отправку с backoff и учитывает `AbortSignal`.

```ts
const controller = new AbortController();

await ctx.api.sendMessageToChat(ctx.chatId!, 'Видео', {
  attachments: [video.toJson()],
  signal: controller.signal,
});
```

## Другие вложения

```ts
import { LocationAttachment, ShareAttachment, StickerAttachment } from 'max-io';

await ctx.reply('', {
  attachments: [new StickerAttachment({ code: 'sticker-code' }).toJson()],
});

await ctx.reply('Геолокация', {
  attachments: [new LocationAttachment({ lon: 37.6173, lat: 55.7558 }).toJson()],
});

await ctx.reply('Ссылка', {
  attachments: [new ShareAttachment({ url: 'https://example.com' }).toJson()],
});
```

## Проверочные сценарии

- `examples/01-basic-minimum` — базовые upload-примеры.
- `examples/pr-scenarios/src/10-pr-227-upload-progress.ts` — progress, cancel, range/multipart режимы и отправка результата в чат.
