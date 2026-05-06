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
import { Polling, type PollingState } from './network/polling';

const debug = createDebug('max-io:main');

type BotPollingConfig = {
  /** Marker, с которого long polling начнёт получать updates. */
  marker?: number;
};

type BotConfig<Ctx extends Context> = {
  clientOptions?: ClientOptions;
  contextType: new (...args: ConstructorParameters<typeof Context>) => Ctx;
  polling?: BotPollingConfig;
};

type LaunchOptions = {
  /** Список update-типов, которые нужно получать через long polling. */
  allowedUpdates?: UpdateType[];
  /** Marker, с которого нужно начать текущий запуск long polling. */
  marker?: number;
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
  polling: config?.polling,
});

class BotPollingFacade {
  constructor(
    private readonly state: PollingState,
    private readonly getCurrentPolling: () => Polling | undefined,
  ) {}

  get marker() {
    return this.state.marker;
  }

  /**
   * Устанавливает marker long polling.
   *
   * @param marker Последний обработанный marker или `undefined`, чтобы сбросить значение.
   */
  setMarker(marker?: number) {
    this.state.marker = marker;
    this.getCurrentPolling()?.setMarker(marker);
  }
}

export class Bot<Ctx extends Context = Context> extends Composer<Ctx> {
  api: Api;

  public botInfo?: BotInfo;

  public readonly polling: BotPollingFacade;

  private currentPolling?: Polling;

  private pollingIsStarted = false;

  private readonly config: BotConfig<Ctx>;

  private readonly pollingState: PollingState;

  constructor(token: string, config?: Partial<BotConfig<Ctx>>) {
    super();

    this.config = resolveConfig(config);
    this.pollingState = {
      marker: this.config.polling?.marker,
    };
    this.polling = new BotPollingFacade(
      this.pollingState,
      () => this.currentPolling,
    );
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

    if (options?.marker !== undefined) {
      this.polling.setMarker(options.marker);
    }

    this.pollingIsStarted = true;

    this.botInfo ??= await this.api.getMyInfo();
    this.currentPolling = new Polling(
      this.api,
      options?.allowedUpdates,
      this.pollingState,
    );

    debug(`Starting @${this.botInfo.username}`);

    try {
      await this.currentPolling.loop(this.handleUpdate);
    } finally {
      this.currentPolling = undefined;
      this.pollingIsStarted = false;
    }
  };

  stop = () => {
    if (!this.pollingIsStarted) {
      debug('Long polling is not running');
      return;
    }

    this.currentPolling?.stop();
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
