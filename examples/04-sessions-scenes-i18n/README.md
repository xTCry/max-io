# 04-sessions-scenes-i18n

Отдельный TypeScript mini-project для проверки typed context со связкой `session`, `scene` и `i18n`.

Пример показывает два сценария:

- простую step-scene `/intro`, где state сцены типизируется отдельно от общей session;
- inline-сцену `/extra`, где кнопки редактируют текущее callback-сообщение, выбранный язык меняет локаль интерфейса, а заметка пользователя прикрепляется к итоговому сообщению как reply-link.

## Env

```env
MAX_BOT_TOKEN=<token>
ADMIN_ID=<optional-user-id>
DEBUG=max-io:main
```

## Запуск

```bash
yarn install
yarn typecheck
yarn start
```

## Команды

- `/start` — проверяет session-счётчик и i18n.
- `/intro` — запускает step scene: имя -> возраст -> итоговое сообщение.
- `/extra` — запускает extra scene с inline-кнопками, сменой языка, частотой уведомлений, state и сохранением результата в session.
- `/cancel` — выходит из активной scene.
- `/help` — показывает список команд.

Логи updates пишутся в `logs-bot/*.jsonl`; папка исключена из git.

В `locales/ru.yml` и `locales/en.yml` лежат одинаковые ключи переводов. Если выбрать English в `/extra`, текущая сцена сразу перерисуется на английском и выбранная локаль сохранится в session через `useSession: true`.
