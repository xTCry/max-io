# 02 Chat Admin Management

Отдельный sample-проект для ручной проверки методов управления администраторами группового чата.

## Что проверяет

- `api.getChatAdmins(chatId)` — получить список администраторов.
- `api.setChatAdmins(chatId, admins)` — назначить или обновить администратора.
- `api.deleteChatAdmin(chatId, userId)` — снять права администратора.
- `api.deleteChat(chatId)` — удалить групповой чат для всех участников.

## Переменные окружения

Обязательные:

- `MAX_BOT_TOKEN` — токен бота.
- `MAX_ADMIN_CHAT_ID` — ID группового чата. Для групповых чатов Max ID может быть отрицательным.
- `MAX_ADMIN_USER_ID` — ID пользователя для `set-admin` и `delete-admin`.

Опциональные:

- `MAX_ADMIN_PERMISSIONS` — права администратора через запятую. По умолчанию: `read_all_messages,add_remove_members,write`.
- `MAX_ADMIN_ALIAS` — alias администратора в клиентах Max.
- `MAX_ADMIN_CONFIRM_DELETE_CHAT` — защита для команды `delete-chat`; нужно явно поставить `true`.

## Права администратора

Для `set-admin` бот должен быть администратором чата с правом `add_admins`. Если бот админ, но без `add_admins`, API возвращает `403 chat.denied / permission.denied`.

Права, которые удалось назначать обычным admin-ботом:

`add_remove_members,can_call,edit_link,read_all_messages,pin_message,change_chat_info,write`

Права, которые видны у владельца чата, но не назначались обычным admin-ботом:

`edit,view_stats,delete`

Возможно, для таких прав нужен владелец чата или отдельный уровень доступа, которого у обычного бота-администратора нет.

Если вызвать `delete-chat` без права `delete`, API может вернуть успешный HTTP-ответ с телом `success: false` и сообщением `Insufficient access rights to perform this action`.

## Запуск

```bash
yarn install
cp .env.example .env
```

Команды:

```bash
yarn get-admins
yarn set-admin
yarn delete-admin
yarn delete-chat
```

Команду `delete-chat` запускать только на тестовом чате: она удаляет групповой чат для всех участников.

## Проверка локальной dev-сборки `max-io`

Если изменения в библиотеке ещё не опубликованы в npm:

1. В корне репозитория выполнить `yarn build`.
2. В корне репозитория выполнить `node scripts/copy-to-sample.js`.
3. Запускать команды уже из этого example-проекта.
