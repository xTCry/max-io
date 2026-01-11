import createDebug from 'debug';

import { Api } from './api';
import { Composer } from './composer';
import { Context } from './context';
import { MaybePromise } from './helpers/types';
import {
  BotInfo,
  ClientOptions,
  createClient,
  Update,
  UpdateType,
} from './network/api';
import { Polling } from './network/polling';

const debug = createDebug('max-io:main');

type BotConfig<Ctx extends Context> = {
  clientOptions?: ClientOptions;
  contextType: new (...args: ConstructorParameters<typeof Context>) => Ctx;
};

type LaunchOptions = {
  allowedUpdates: UpdateType[];
};

const defaultConfig: BotConfig<Context> = {
  contextType: Context,
};

const resolveConfig = <Ctx extends Context>(
  config?: Partial<BotConfig<Ctx>>,
): BotConfig<Ctx> => ({
  clientOptions: config?.clientOptions,
  contextType: (config?.contextType ??
    defaultConfig.contextType) as BotConfig<Ctx>['contextType'],
});

export class Bot<Ctx extends Context = Context> extends Composer<Ctx> {
  api: Api;

  public botInfo?: BotInfo;

  private polling?: Polling;

  private pollingIsStarted = false;

  private config: BotConfig<Ctx>;

  constructor(token: string, config?: Partial<BotConfig<Ctx>>) {
    super();

    this.config = resolveConfig(config);
    this.api = new Api(createClient(token, this.config.clientOptions));

    debug('Created `Bot` instance');
  }

  private handleError = (err: unknown, ctx: Ctx): MaybePromise<void> => {
    process.exitCode = 1;
    console.error('Unhandled error while processing', ctx.update);
    throw err;
  };

  catch(handler: (err: unknown, ctx: Ctx) => MaybePromise<void>) {
    this.handleError = handler;
    return this;
  }

  start = async (options?: LaunchOptions) => {
    if (this.pollingIsStarted) {
      debug('Long polling already running');
      return;
    }

    this.pollingIsStarted = true;

    this.botInfo ??= await this.api.getMyInfo();
    this.polling = new Polling(this.api, options?.allowedUpdates);

    debug(`Starting @${this.botInfo.username}`);
    await this.polling.loop(this.handleUpdate);

    this.pollingIsStarted = false;
  };

  stop = () => {
    if (!this.pollingIsStarted) {
      debug('Long polling is not running');
      return;
    }

    this.polling?.stop();
    this.pollingIsStarted = false;
  };

  private handleUpdate = async (update: Update) => {
    const updateId = `${update.update_type}:${update.timestamp}`;
    debug(`Processing update ${updateId}`);

    const UpdateContext = this.config.contextType;
    const ctx = new UpdateContext(update, this.api, this.botInfo);

    try {
      await this.middleware()(ctx, () => Promise.resolve(undefined));
    } catch (err) {
      await this.handleError(err, ctx);
    } finally {
      debug(`Finished processing update ${updateId}`);
    }
  };
}
