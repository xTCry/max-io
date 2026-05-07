# 03 Webhook Subscriptions

Отдельный sample-проект для ручной проверки WebHook subscriptions API.

## Что проверяет

- `api.getSubscriptions()` — получить список WebHook-подписок.
- `api.subscribe({ url, update_types, secret })` — настроить доставку updates через WebHook.
- `api.unsubscribe(url)` — удалить WebHook-подписку по URL.
- Локальный HTTP receiver для просмотра входящих webhook updates.

## Переменные окружения

Обязательные:

- `MAX_BOT_TOKEN` — токен бота.
- `MAX_WEBHOOK_URL` — публичный HTTPS URL или домен webhook endpoint. Для локальной проверки обычно нужен туннель. Path из этой переменной заменяется значением `MAX_WEBHOOK_PATH`.

Опциональные:

- `MAX_WEBHOOK_PORT` — локальный порт HTTP-сервера. По умолчанию: `3000`.
- `MAX_WEBHOOK_SERVER_MODE` — режим локального сервера. `builtin` запускает сервер через `bot.start({ webhook })`, `custom` поднимает свой `node:http` server и подключает `bot.webhookCallback(...)`. По умолчанию: `builtin`.
- `MAX_WEBHOOK_PATH` — path webhook endpoint внутри локального сервера и публичной подписки. Если указан, должен начинаться с `/`. Если пусто в `builtin` режиме, библиотека сгенерирует безопасный path по токену. В `custom` режиме значение обязательно.
- `MAX_WEBHOOK_SECRET` — секрет для заголовка `X-Max-Bot-Api-Secret`. По схеме: `5-256` символов, разрешены `A-Z`, `a-z`, `0-9` и дефис.
- `MAX_WEBHOOK_UPDATE_TYPES` — типы updates через запятую. Пустое значение означает подписку на все доступные типы.
- `MAX_WEBHOOK_AUTO_SUBSCRIBE` — при `true` команда `yarn server` сразу получает список подписок и создаёт/обновляет подписку из `.env`. По умолчанию: `true`.
- `MAX_WEBHOOK_DELETE_PREVIOUS` — при `true` перед новой подпиской удаляет другие WebHook-подписки бота. По умолчанию: `true`.

## Запуск

```bash
yarn install
cp .env.example .env
```

Запустить локальный receiver:

```bash
yarn server
```

По умолчанию используется встроенный runtime библиотеки:

```env
MAX_WEBHOOK_SERVER_MODE=builtin
```

Если нужно проверить ручную интеграцию с собственным HTTP-сервером:

```env
MAX_WEBHOOK_SERVER_MODE=custom
```

В обоих режимах incoming updates проходят через middleware бота, поэтому команды `/help` и `/ping` должны отвечать одинаково.

При запуске `server` пример сразу:

- печатает текущие подписки;
- создаёт или обновляет подписку, если `MAX_WEBHOOK_AUTO_SUBSCRIBE=true`;
- открывает интерактивную консоль для управления подписками без третьего терминала.

Команды внутри запущенного `server`:

```text
help
list
subscribe
unsubscribe
exit
```

Разовые команды тоже доступны, если нужно проверить API отдельно:

```bash
yarn subscribe
yarn get-subs
yarn unsubscribe
```

## Локальная проверка через туннель

Webhook URL должен быть публичным HTTPS endpoint. Пример с [`cloudflared`](https://developers.cloudflare.com/tunnel/setup/):

```bash
cloudflared tunnel --url http://localhost:3000
```

После запуска туннеля укажите публичный URL. Path можно держать отдельно в `MAX_WEBHOOK_PATH`:

```bash
MAX_WEBHOOK_URL=https://example.trycloudflare.com
MAX_WEBHOOK_PATH=/max-webhook
```

## Проверка локальной dev-сборки `max-io`

Если изменения в библиотеке ещё не опубликованы в npm:

1. В корне репозитория выполнить `yarn build`.
2. В корне репозитория выполнить `node scripts/copy-to-sample.js`.
3. Запускать команды уже из этого example-проекта.
