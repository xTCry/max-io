# Examples

Каталог `examples/` содержит независимые mini-project на TypeScript для ручной проверки `max-io`.

Структура:

- `01-basic-minimum/` — базовый mini-project с примерами из upstream `examples/`.
- `02-chat-admin-management/` — отдельный mini-project для проверки методов управления администраторами чата.
- `03-webhook-subscriptions/` — отдельный mini-project для проверки WebHook subscriptions API.
- `04-sessions-scenes-i18n/` — отдельный mini-project для проверки typed context со связкой session, scene и i18n.
- `pr-scenarios/` — отдельный mini-project для ручной проверки проблем, PR и регрессий.

Принцип работы:

- каждый пример — отдельный проект со своим `package.json` и `tsconfig.json`;
- примеры зависят от установленного пакета `max-io`;
- для проверки локальных изменений до публикации можно собрать библиотеку и скопировать dev-build в `node_modules` примеров через `scripts/copy-to-sample.js`.

Типовой цикл:

1. В корне проекта выполнить `yarn build`.
2. В корне проекта выполнить `node scripts/copy-to-sample.js`.
3. В нужном example-проекте установить зависимости и запускать сценарии локально.

Замечание:

- runtime-запуск примеров сделан через `tsx`, чтобы не собирать каждый mini-project вручную перед запуском.
