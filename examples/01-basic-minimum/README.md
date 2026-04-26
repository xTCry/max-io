# 01 Basic Minimum

## Переменные окружения

Обязательные:
- `MAX_BOT_TOKEN` — токен бота.

Опциональные:
- `MAX_IMAGE_URL` — URL картинки для `attachments-bot`.
- `MAX_IMAGE_TOKEN` — готовый token картинки для команды `/album`.
- `MAX_STICKER_CODE` — код стикера для команды `/sticker`.

Для `attachments-bot` нужны локальные файлы в `public/`:
- `public/video.mp4`
- `public/audio.mp3`
- `public/image.png`

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
