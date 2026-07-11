# Заметки по API Max

Этот файл нужен для коротких практических оговорок, которые важны разработчику, но перегружают главный README.

## Long polling и webhook

Max Bot API может доставлять updates через long polling или webhook. Если у бота остались активные webhook-подписки, long polling может не получать ожидаемые updates. Поэтому `bot.start()` по умолчанию удаляет webhook-подписки перед запуском polling.

Long polling подходит для разработки и ручной проверки, но не должен быть основным production-режимом. Если `marker` не передан, API возвращает только последнее обновление, а не всю очередь событий за время недоступности бота.

> С 11.05.2026 для long polling заявлены ограничения:
>
> - максимум `2 RPS`;
> - timeout запроса `30` секунд;
> - максимум `100` событий в batch;
> - TTL событий `24` часа.

Для стабильной доставки событий используйте webhook-подписку: [`POST /subscriptions`](https://dev.max.ru/docs-api/methods/POST/subscriptions).

## `attachment.not.ready`

После upload файл может быть ещё не готов к отправке как attachment. `max-io` повторяет отправку сообщения с backoff и поддерживает отмену через `AbortSignal`.

## `removeChatMember`

Для групповых чатов `chatId` обычно отрицательный. Параметр `block: true` ведёт себя как ban: пользователь не может вернуться по ссылке. Отдельный стабильный unban endpoint пока не подтверждён.

## `deleteChat`

Метод зависит от прав бота. Если у бота нет права `delete`, API возвращает `success: false` и сообщение о нехватке прав.

## Reply keyboard

Сервер принимает `reply_keyboard`, но визуальная поддержка зависит от конкретного клиента Max. Перед production-использованием нужно проверить целевые клиенты.

## Схемы и живое поведение

OpenAPI-схема, Go SDK и фактическое поведение API иногда расходятся. Для новых публичных типов и методов лучше фиксировать источник: схема, runtime-проверка или payload из живого API.

Текущий ориентир для типизации — архив OpenAPI-схем [`max-messenger-bot/max-bot-api-schemas`](https://github.com/max-messenger-bot/max-bot-api-schemas), файл `schema_2026_07_01`, версия Bot API `0.0.32`.

Если поле или событие исчезло из актуальной схемы, но уже было частью публичных типов `max-io` или встречалось в runtime-ответах, библиотека временно оставляет его и помечает `@deprecated`. Это снижает риск breaking changes при обновлении схемы.

Схема `schema_2026_07_01` указывает server URL `https://platform-api2.max.ru`. В `max-io` дефолт пока остаётся `https://platform-api.max.ru`, но endpoint можно переопределить через `new Bot(token, { apiBaseUrl })` или `createClient(token, { baseUrl })`.

Метод обновления команд через `PATCH /me/commands` добавлен по upstream TS client `@maxhub/max-bot-api@0.2.5`; в архиве схем `0.0.32` он пока не описан отдельным path.
