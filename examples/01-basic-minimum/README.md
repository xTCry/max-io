# 01 Basic Minimum

## Переменные окружения

Обязательные:
- `MAX_BOT_TOKEN` — токен бота.

Опциональные:
- `DEBUG` — namespace для отладки `debug`. Загружается из `.env` через `dotenv/config` до старта бота.
- `MAX_IMAGE_URL` — URL картинки для `attachments-bot`.
- `MAX_IMAGE_TOKEN` — готовый token картинки для команды `/album`.
- `MAX_STICKER_CODE` — код стикера для команды `/sticker`.

Быстрый старт по env:
- скопировать `.env.example` в `.env`;
- заполнить `MAX_BOT_TOKEN`;
- при необходимости включить `DEBUG=max-io:*`.

## Demo Assets

Для `attachments-bot` нужны локальные файлы в `public/`:
- `public/video.mp4`
- `public/audio.mp3`
- `public/image.png`

Файлы внутри `public/` исключены из git и предполагаются как локальные demo-ассеты.

Пример скачивания с `samplelib.com`:

```bash
curl -L -o public/image.png https://samplelib.com/png/sample-boat-400x300.png
curl -L -o public/audio.mp3 https://samplelib.com/lib/preview/mp3/sample-3s.mp3
curl -L -o public/video.mp4 https://samplelib.com/lib/preview/mp4/sample-5s.mp4
```

## Установка

```bash
yarn install
```

## Запуск

`yarn start` выводит список доступных сценариев.

```bash
yarn start
yarn start:attachments
yarn start:custom-context
yarn start:keyboard
yarn start:start-payload
```

При запуске каждый сценарий пишет в консоль:
- что бот инициализирован;
- какой сценарий запущен;
- список доступных команд;
- что long polling стартовал.

Если отправить обычный текст вместо команды, бот вернёт подсказку по доступным сценарным командам.

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

3. После этого запускать нужный example-проект уже с локально скопированным dev-build.
