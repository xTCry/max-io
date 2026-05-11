# 2. Updates, команды и ответы

После запуска бот получает updates от Max API. В `max-io` их можно обрабатывать через универсальный `bot.on(...)` или через удобные helpers.

## Updates

```ts
bot.on('bot_started', async (ctx) => {
  await ctx.reply('Привет! Используй /start');
});

bot.on('message_created', async (ctx) => {
  console.log(ctx.message?.body?.text);
});

bot.on('message_callback', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Нажатие принято' });
});
```

Редактор подскажет доступные `update_type`, потому что типы экспортируются из `max-io` и `max-io/types`.

## Команды

```ts
bot.command('start', async (ctx) => {
  await ctx.reply('Команда /start');
});
```

Команды поддерживают аргументы:

```ts
bot.command('echo', async (ctx) => {
  await ctx.reply(ctx.payload || 'Напиши /echo текст');
});

bot.command('ban', async (ctx) => {
  const [userId, ...reasonParts] = ctx.args ?? [];
  await ctx.reply(`userId=${userId}, reason=${reasonParts.join(' ')}`);
});
```

Поддерживаемые варианты обращения:

```text
/start
/start payload
/start@bot_username payload
@bot_username /start payload
```

Если нужно изменить допустимый prefix команды:

```ts
const bot = new Bot(token, {
  commandPrefix: ['/', '!'],
});
```

## Текстовые сообщения

```ts
bot.hears('hello', async (ctx) => {
  await ctx.reply('hello');
});

bot.hears(/echo (.+)/i, async (ctx) => {
  await ctx.reply(`match: ${ctx.match![1]}`);
});
```

## Callback-кнопки

```ts
bot.action('profile:open', async (ctx) => {
  await ctx.answerOnCallback({ notification: 'Открываем профиль' });
});

bot.action(/color:(.+)/, async (ctx) => {
  await ctx.answerOnCallback({ notification: `Цвет: ${ctx.match![1]}` });
});
```

## Отправка сообщений

Через context:

```ts
bot.hears('ping', async (ctx) => {
  await ctx.reply('pong');
});
```

Через API:

```ts
await bot.api.sendMessageToUser(userId, 'Привет!');
await bot.api.sendMessageToChat(chatId, 'Всем привет!');
```

Ответ с reply-link:

```ts
bot.hears('ping', async (ctx) => {
  const mid = ctx.message?.body?.mid;
  await ctx.reply('pong', {
    link: mid ? { type: 'reply', mid } : undefined,
  });
});
```

## Форматирование

Max API поддерживает `markdown` и `html`. Подробности по допустимой разметке смотрите в официальной документации: [форматирование текста в сообщениях](https://dev.max.ru/docs-api#Форматирование%20текста%20в%20сообщениях).

```ts
await ctx.reply('**Привет!** _Добро пожаловать_', {
  format: 'markdown',
});
```

```ts
await ctx.reply('<b>Привет!</b> <i>Добро пожаловать</i>', {
  format: 'html',
});
```

В текущей версии `max-io` форматирование передаётся как строка и `format`. Отдельные builder/helper-функции для безопасной сборки разметки планируются отдельно.

## Polling marker

Long polling возвращает `marker` — указатель на следующую порцию событий. В `max-io` marker доступен через `bot.polling`.

```ts
const bot = new Bot(token, {
  polling: { marker: savedMarker },
});
// или
bot.polling.setMarker(savedMarker);
console.log(bot.polling.marker);

await bot.start({ marker: bot.polling.marker });
```

Если `marker` не передать, Max API возвращает только последнее обновление. Это значит, что события, которые пришли пока бот был недоступен, не будут автоматически дочитаны при новом запуске.

Если храните marker во внешнем хранилище, обновляйте его после успешной обработки updates. Так бот сможет продолжить чтение с сохранённой позиции, пока события ещё не удалены по TTL.

По уведомлению Max API с 11.05.2026 для long polling действуют ограничения: не больше `2 RPS`, timeout запроса `30` секунд, batch до `100` событий и TTL событий `24` часа. Для production лучше использовать Webhook.

## `ctx.state`

`ctx.state` — объект на время одного update. Он удобен для передачи данных между middleware без session.

```ts
bot.use(async (ctx, next) => {
  ctx.state.startedAt = Date.now();
  await next();
});
```

## Raw API

Если typed-wrapper ещё не покрывает редкий endpoint, можно вызвать raw client:

```ts
await ctx.api.raw.patch('chats/{chat_id}', {
  path: { chat_id: chatId },
  body: { title: 'Новый заголовок' },
});
```

Typed-wrapper предпочтительнее raw-вызова, но raw API полезен для проверки новых возможностей Max API.
