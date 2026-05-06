import { Context, type FilteredContext } from './context';
import { createdMessageBodyHas } from './filters';
import type { Guard, MaybeArray } from './helpers/types';
import type {
  Middleware,
  MiddlewareFn,
  MiddlewareObj,
  NextFn,
} from './middleware';
import type { Message, UpdateType } from './network/api';

export type CommandPrefix = true | string | string[];
export type Triggers<C> = MaybeArray<string | RegExp | TriggerFn<C>>;
type TriggerFn<C> = (value: string, ctx: C) => RegExpExecArray | null;

type UpdateFilter<Ctx extends Context> = UpdateType | Guard<Ctx['update']>;

export class Composer<Ctx extends Context> implements MiddlewareObj<Ctx> {
  private handler: MiddlewareFn<Ctx>;

  private commandPrefix: CommandPrefix;

  constructor(...middlewares: Array<Middleware<Ctx>>) {
    this.commandPrefix = true;
    this.handler = Composer.compose(middlewares);
  }

  middleware() {
    return this.handler;
  }

  use(...middlewares: Array<Middleware<Ctx>>) {
    this.handler = Composer.compose([this.handler, ...middlewares]);
    return this;
  }

  protected setCommandPrefix(prefix: CommandPrefix) {
    this.commandPrefix = prefix;
  }

  on<Filter extends UpdateType | Guard<Ctx['update']>>(
    filters: MaybeArray<Filter>,
    ...middlewares: Array<Middleware<FilteredContext<Ctx, Filter>>>
  ) {
    return this.use(this.filter(filters, ...middlewares));
  }

  command(
    command: Triggers<FilteredContext<Ctx, 'message_created'>>,
    ...middlewares: Array<Middleware<FilteredContext<Ctx, 'message_created'>>>
  ) {
    const normalizedTriggers = normalizeTriggers(command);
    const filter = createdMessageBodyHas('text');

    const handler = Composer.compose(middlewares);

    return this.use(
      this.filter(filter, (ctx, next) => {
        const text = extractTextFromMessage(ctx.message, ctx.myId)!;
        const parsedCommand = parseCommandText({
          text,
          myId: ctx.myId,
          botUsername: ctx.botInfo?.username,
          prefix: this.commandPrefix,
        });

        if (!parsedCommand) return next();

        for (const trigger of normalizedTriggers) {
          const match = trigger(parsedCommand.command, ctx);
          // TODO? use `defineProperty` insted `parseCommandText`, to make parsing lazy on access
          if (match) {
            ctx.command = parsedCommand.command;
            ctx.payload = parsedCommand.payload;
            ctx.args = parseCommandArgs(parsedCommand.payload);
            ctx.match = match;
            return handler(ctx, next);
          }
        }

        return next();
      }),
    );
  }

  hears(
    triggers: Triggers<FilteredContext<Ctx, 'message_created'>>,
    ...middlewares: Array<Middleware<FilteredContext<Ctx, 'message_created'>>>
  ) {
    const normalizedTriggers = normalizeTriggers(triggers);
    const filter = createdMessageBodyHas('text');

    const handler = Composer.compose(middlewares);

    return this.use(
      this.filter(filter, (ctx, next) => {
        const text = extractTextFromMessage(ctx.message, ctx.myId)!;

        for (const trigger of normalizedTriggers) {
          const match = trigger(text, ctx);
          if (match) {
            ctx.match = match;
            return handler(ctx, next);
          }
        }

        return next();
      }),
    );
  }

  action(
    triggers: Triggers<FilteredContext<Ctx, 'message_callback'>>,
    ...middlewares: Array<Middleware<FilteredContext<Ctx, 'message_callback'>>>
  ) {
    const normalizedTriggers = normalizeTriggers(triggers);
    const handler = Composer.compose(middlewares);

    return this.use(
      this.filter('message_callback', (ctx, next) => {
        const { payload } = ctx.update.callback;

        if (!payload) return next();

        for (const trigger of normalizedTriggers) {
          const match = trigger(payload, ctx);
          if (match) {
            ctx.match = match;
            return handler(ctx, next);
          }
        }

        return next();
      }),
    );
  }

  filter<Filter extends UpdateFilter<Ctx>>(
    filters: MaybeArray<Filter>,
    ...middlewares: Array<Middleware<FilteredContext<Ctx, Filter>>>
  ): MiddlewareFn<Ctx> {
    const handler = Composer.compose(middlewares);
    return (ctx, next) => {
      return ctx.has(filters) ? handler(ctx, next) : next();
    };
  }

  static flatten<C extends Context>(mw: Middleware<C>): MiddlewareFn<C> {
    return typeof mw === 'function'
      ? mw
      : (ctx, next) => mw.middleware()(ctx, next);
  }

  static concat<C extends Context>(
    first: MiddlewareFn<C>,
    andThen: MiddlewareFn<C>,
  ): MiddlewareFn<C> {
    return async (ctx, next) => {
      let nextCalled = false;
      await first(ctx, async () => {
        if (nextCalled) {
          throw new Error('`next` already called before!');
        }
        nextCalled = true;
        await andThen(ctx, next);
      });
    };
  }

  static pass<C extends Context>(_ctx: C, next: NextFn) {
    return next();
  }

  static compose<C extends Context>(middlewares: Array<Middleware<C>>) {
    if (!Array.isArray(middlewares)) {
      throw new Error('Middlewares must be an array');
    }
    if (middlewares.length === 0) {
      return Composer.pass;
    }
    return middlewares.map(Composer.flatten).reduce(Composer.concat);
  }
}

function escapeRegExp(s: string) {
  // $& means the whole matched string
  return s.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

const normalizeTriggers = <C extends Context>(triggers: Triggers<C>) =>
  (Array.isArray(triggers) ? triggers : [triggers]).map((trigger) => {
    if (!trigger) throw new Error('Invalid trigger');
    if (typeof trigger === 'function') return trigger;
    if (trigger instanceof RegExp) {
      return (value = '') => {
        // eslint-disable-next-line no-param-reassign
        trigger.lastIndex = 0;
        return trigger.exec(value.trim());
      };
    }
    const regex = new RegExp(`^${escapeRegExp(trigger)}$`);
    return (value: string) => regex.exec(value.trim());
  });

type ParseCommandTextOptions = {
  text: string;
  myId?: number;
  botUsername?: string | null;
  prefix: CommandPrefix;
};

type ParsedCommand = {
  command: string;
  payload: string;
};

const parseCommandText = ({
  text,
  myId,
  botUsername,
  prefix,
}: ParseCommandTextOptions): ParsedCommand | null => {
  const trimmedText = text.trim();
  const mentionedCommand = stripLeadingBotMention(trimmedText, botUsername);

  if (mentionedCommand) {
    return parseCommandCandidate(mentionedCommand, prefix, botUsername);
  }

  // if (trimmedText.startsWith('@')) {
  //   return null;
  // }

  const directCommand = parseCommandCandidate(trimmedText, prefix, botUsername);

  if (directCommand) {
    return directCommand;
  }

  return null;
};

const parseCommandCandidate = (
  text: string,
  prefix: CommandPrefix,
  botUsername?: string | null,
): ParsedCommand | null => {
  const commandStart = getCommandStart(text, prefix);

  if (!commandStart) {
    return null;
  }

  const withoutPrefix = text.slice(commandStart.length).trimStart();
  const separatorIndex = withoutPrefix.search(/\s/);
  const rawCommand =
    separatorIndex === -1
      ? withoutPrefix
      : withoutPrefix.slice(0, separatorIndex);

  if (!rawCommand) {
    return null;
  }

  const [command, mention] = rawCommand.split('@');

  if (!command) {
    return null;
  }

  if (mention && !isOwnBotMention(mention, botUsername)) {
    return null;
  }

  const payloadStart = commandStart.length + rawCommand.length;

  return {
    command,
    payload: text.slice(payloadStart).trimStart(),
  };
};

const getCommandStart = (text: string, prefix: CommandPrefix) => {
  if (!text) {
    return undefined;
  }

  if (prefix === true) {
    return text[0];
  }

  const prefixes = Array.isArray(prefix) ? prefix : [prefix];
  return prefixes.find((item) => item.length > 0 && text.startsWith(item));
};

const isOwnBotMention = (mention: string, botUsername?: string | null) => {
  if (!botUsername) {
    return false;
  }

  return mention.toLowerCase() === botUsername.toLowerCase();
};

const stripLeadingBotMention = (text: string, botUsername?: string | null) => {
  const match = /^@(\S+)\s+(.+)$/.exec(text);

  if (!match) {
    return undefined;
  }

  const [, mention, rest] = match;

  if (!mention || !rest) {
    return undefined;
  }

  const isOwnUsername = isOwnBotMention(mention, botUsername);

  if (!isOwnUsername) {
    return undefined;
  }

  return rest.trimStart();
};

const parseCommandArgs = (payload: string) => {
  const args: string[] = [];
  let quote: '"' | "'" | undefined;
  let current = '';
  let escaped = false;

  for (const char of payload) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
        continue;
      }

      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaped) {
    current += '\\';
  }

  if (current) {
    args.push(current);
  }

  return args;
};

const extractTextFromMessage = (message: Message, myId?: number) => {
  const { text } = message.body;

  const mention = message.body.markup?.find((m) => {
    return m.type === 'user_mention';
  });

  if (mention && mention.from === 0 && mention.user_id === myId) {
    return text?.slice(mention.length).trim();
  }

  return text;
};
