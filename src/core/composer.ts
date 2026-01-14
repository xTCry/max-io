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

export type Triggers<C> = MaybeArray<string | RegExp | TriggerFn<C>>;
type TriggerFn<C> = (value: string, ctx: C) => RegExpExecArray | null;

type UpdateFilter<Ctx extends Context> = UpdateType | Guard<Ctx['update']>;

export class Composer<Ctx extends Context> implements MiddlewareObj<Ctx> {
  private handler: MiddlewareFn<Ctx>;

  constructor(...middlewares: Array<Middleware<Ctx>>) {
    this.handler = Composer.compose(middlewares);
  }

  middleware() {
    return this.handler;
  }

  use(...middlewares: Array<Middleware<Ctx>>) {
    this.handler = Composer.compose([this.handler, ...middlewares]);
    return this;
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

        // TODO: добавить првоерку на разрешенные символы начала команды (например /, !)
        const cmd = text.slice(1);

        for (const trigger of normalizedTriggers) {
          const match = trigger(cmd, ctx);
          if (match) {
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
