# PR Scenarios

Отдельный sample-проект для ручной проверки проблем, pull requests и регрессий вокруг `max-io`.

Текущие сценарии:

- `10-pr-227-upload-progress` — площадка для ручной проверки upload pipeline, поведения chunked/multipart загрузки, консольного прогресса и ручной отмены upload.
- `20-chat-moderation-bot` — ручной сценарий простого бота модерации группового чата.

## Переменные окружения

Обязательные:

- `MAX_BOT_TOKEN` — токен бота.

Опциональные:

- `DEBUG` — namespace для отладки `debug`. Загружается из `.env` через `dotenv/config` до старта бота.
- `MAX_UPLOAD_PROGRESS_VIDEO_PATH` — путь к файлу для `uploadVideo`. По умолчанию: `public/video.mp4`.
- `MAX_UPLOAD_PROGRESS_AUDIO_PATH` — путь к файлу для `uploadAudio`. По умолчанию: `public/audio.mp3`.
- `MAX_UPLOAD_PROGRESS_FILE_PATH` — путь к файлу для `uploadFile` через buffer. По умолчанию: `public/video.mp4`.
- `MAX_UPLOAD_PROGRESS_IMAGE_PATH` — путь к файлу для `uploadImage` через multipart. По умолчанию: `public/image.png`.
- `MAX_UPLOAD_PROGRESS_TIMEOUT` — timeout загрузки в миллисекундах. По умолчанию: `60000`.
- `MAX_MODERATION_USERNAME_LOOKUP_LIMIT` — максимальное количество участников, среди которых сценарий ищет `@username`. По умолчанию: `300`.

Быстрый старт по env:

- скопировать `.env.example` в `.env`;
- заполнить `MAX_BOT_TOKEN`;
- при необходимости включить `DEBUG=max-io:*`.

## Установка

```bash
yarn install
```

## Запуск

`yarn start` выводит список доступных сценариев.

```bash
yarn start
yarn start:10-pr-227-upload-progress
yarn start:20-chat-moderation-bot
```

Во время upload сценарий показывает в консоли:

- один живой прогрессбар с процентами, объёмом, режимом загрузки и текущим этапом;
- время выполнения;
- короткие финальные события `START`, `UPLOADED`, `SENT`.

Дополнительно:

- `Esc` в терминале прерывает текущую загрузку файла;
- progress идёт через публичный `onProgress`, а отмена через `AbortSignal`, без подмены транспорта.

Если отправить обычный текст вместо команды, бот вернёт список сценарных команд.

## Что проверяет сценарий `20-chat-moderation-bot`

Сценарий запускает простого бота модерации для группового чата. Бот реагирует только на администраторов чата и показывает команды через `/help`.

Доступные команды:

- `/kick 123456 причина` — удалить участника без блокировки.
- `/kick @username причина` — найти участника по username и удалить без блокировки.
- `/kick причина` — удалить автора сообщения, если команда отправлена reply/forward.
- `/ban 123456 причина` — удалить участника с `block: true`, то есть заблокировать вход обратно.
- `/ban @username причина` — найти участника по username и заблокировать.
- `/invite 123456` — попробовать пригласить пользователя обратно.
- `/unban 123456` — alias для `/invite`, потому что отдельного API unban пока не найдено.

После kick/ban бот отправляет сообщение с кнопкой `Попробовать вернуть`. Callback кнопки повторно проверяет, что её нажал администратор, и делает invite через `addChatMembers`.

`block: true` может блокировать вход по ссылке. Повторный remove с `block: false` не считается рабочим unban. Invite может вернуть `add.participant.privacy`, если пользователь запретил приглашения или нужен ручной invite админом.

Fallback-подсказка в этом сценарии не отвечает на каждое обычное сообщение в чате. Она срабатывает только на сообщения с упоминанием бота.

Поиск по username ограничен переменной `MAX_MODERATION_USERNAME_LOOKUP_LIMIT`, чтобы случайно не выгружать большой список участников.

## Что проверяет сценарий `10-pr-227-upload-progress`

- Проверяет публичные `onProgress` и `signal` в upload API без подмены `fetch`.
- Даёт 4 команды боту: `/videoPath`, `/audioStream`, `/fileBuffer`, `/imagePath`.
- Позволяет руками проверить:
  - chunked upload для `video` и `audio`;
  - multipart upload для `file` и `image`;
  - поведение прогресса в консоли для `range` и `multipart`;
  - ручную отмену активного upload по `Esc`.

## Тяжёлые demo-файлы

Рекомендуемый набор для локальной проверки:

- `public/video.mp4` — `samplelib`, `sample-30s.mp4`, примерно `21 MB`.
- `public/audio.mp3` — `samplelib`, `sample-speech-20m.mp3`, примерно `18 MB`.
- `public/image.png` — `samplelib`, `sample-boat-400x300.png`, примерно `690 KB`.

Почему `image.png` сейчас меньше:

- среди стабильных публичных sample PNG без авторизации и без сомнительных источников быстро находится только лёгкий публичный sample-файл;
- если нужен именно stress-test для `uploadImage` на `10+ MB`, проще положить свой локальный файл и переопределить `MAX_UPLOAD_PROGRESS_IMAGE_PATH`.

## Команды для скачивания demo-файлов

Из каталога `examples/pr-scenarios`:

```bash
curl -L https://samplelib.com/mp4/sample-30s.mp4 -o public/video.mp4
curl -L https://samplelib.com/mp3/sample-speech-20m.mp3 -o public/audio.mp3
curl -L https://samplelib.com/png/sample-boat-400x300.png -o public/image.png
```

Если нужен свой более тяжёлый файл для image/file сценариев:

```bash
MAX_UPLOAD_PROGRESS_IMAGE_PATH=/abs/path/to/your-image.png \
MAX_UPLOAD_PROGRESS_FILE_PATH=/abs/path/to/your-file.bin \
yarn start:10-pr-227-upload-progress
```

## Проверка локальной dev-сборки `max-io`

Если изменения в библиотеке ещё не опубликованы в npm:

1. В корне репозитория выполнить:

```bash
yarn build
```

2. В корне репозитория выполнить:

```bash
node scripts/copy-to-sample.js
```

3. После этого запускать сценарии уже с локально скопированным dev-build.
