import * as http from 'node:http';
import createDebug from 'debug';
import { createHash } from 'node:crypto';

import { Api } from './api';
import { type CommandPrefix, Composer } from './composer';
import { Context } from './context';
import { MaybePromise } from './helpers/types';
import {
  BotInfo,
  ClientOptions,
  createClient,
  Update,
  UpdateType,
} from './network/api';
import type { SubscribeExtra } from './network/api/modules';
import { Polling, type PollingState } from './network/polling';

const debug = createDebug('max-io:main');
const webhookDebug = createDebug('max-io:webhook');

type BotPollingConfig = {
  /** Marker, с которого long polling начнёт получать updates. */
  marker?: number;
};

type WebhookCallbackOptions = {
  /** Секрет из заголовка `X-Max-Bot-Api-Secret`. */
  secret?: string;
};

type WebhookDomainOptions = {
  /** Публичный HTTPS-домен или полный URL webhook. */
  domain: string;
  /** Путь webhook endpoint. Если не указан, будет использован стабильный путь по токену. */
  path?: string;
};

type WebhookStartOptions = WebhookDomainOptions &
  WebhookCallbackOptions & {
    /** Порт локального HTTP-сервера. */
    port?: number;
    /** Host локального HTTP-сервера. */
    host?: string;
    /** Типы updates для WebHook-подписки. */
    allowedUpdates?: UpdateType[];
    /** Если `false`, не вызывает `subscribe` при запуске webhook-сервера. */
    subscribe?: boolean;
    /** Если `false`, оставит другие WebHook-подписки при запуске webhook. */
    deletePreviousWebhooks?: boolean;
    /** Дополнительные поля subscribe request. */
    extra?: Omit<SubscribeExtra, 'url' | 'update_types' | 'secret'>;
  };

type BotConfig<Ctx extends Context> = {
  clientOptions?: ClientOptions;
  commandPrefix?: CommandPrefix;
  contextType: new (...args: ConstructorParameters<typeof Context>) => Ctx;
  polling?: BotPollingConfig;
};

type LaunchOptions = {
  /** Список update-типов, которые нужно получать через long polling. */
  allowedUpdates?: UpdateType[];
  /** Marker, с которого нужно начать текущий запуск long polling. */
  marker?: number;
  /** Если `false`, оставит текущие WebHook-подписки при запуске long polling. */
  deletePreviousWebhooks?: boolean;
  /** Если указан, `start` запустит локальный webhook-сервер вместо long polling. */
  webhook?: WebhookStartOptions;
};

type WebhookDomainResult = {
  domain: string;
  path: string;
  url: string;
};

const defaultConfig: BotConfig<Context> = {
  contextType: Context,
};

const resolveConfig = <Ctx extends Context>(
  config?: Partial<BotConfig<Ctx>>,
): BotConfig<Ctx> => ({
  clientOptions: config?.clientOptions,
  commandPrefix: config?.commandPrefix ?? true,
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

  private webhookServer?: http.Server;

  private pollingIsStarted = false;

  private webhookIsStarted = false;

  private readonly config: BotConfig<Ctx>;

  private readonly pollingState: PollingState;

  constructor(
    private readonly token: string,
    config?: Partial<BotConfig<Ctx>>,
  ) {
    super();

    this.config = resolveConfig(config);
    this.setCommandPrefix(this.config.commandPrefix ?? true);
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
    if (this.pollingIsStarted || this.webhookIsStarted) {
      debug('Bot runtime already running');
      return;
    }

    this.botInfo ??= await this.api.getMyInfo();

    if (options?.webhook) {
      await this.startWebhook(options.webhook, options.allowedUpdates);
      return;
    }

    // * Polling:

    if (options?.deletePreviousWebhooks !== false) {
      await this.deletePreviousWebhooks();
    }

    if (options?.marker !== undefined) {
      this.polling.setMarker(options.marker);
    }

    this.pollingIsStarted = true;

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
    if (!this.pollingIsStarted && !this.webhookIsStarted) {
      debug('Bot runtime is not running');
      return null;
    }

    if (this.pollingIsStarted) {
      this.currentPolling?.stop();
      this.pollingIsStarted = false;
    }

    if (this.webhookIsStarted) {
      webhookDebug('Stopping webhook server');
      this.webhookServer?.close((error) => {
        if (error) {
          webhookDebug('Webhook server close failed', error);
          return;
        }

        webhookDebug('Webhook server stopped');
      });
      this.webhookServer = undefined;
      this.webhookIsStarted = false;
    }
    return true;
  };

  handleUpdate = async (update: Update) => {
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

  webhookCallback = (
    path = '/',
    options: WebhookCallbackOptions = {},
  ): http.RequestListener => {
    webhookDebug('Created webhook callback for path %o', path);

    return async (request, response) => {
      webhookDebug(
        'Incoming webhook request %s %s',
        request.method,
        request.url,
      );

      const requestPath = request.url
        ? new URL(request.url, 'http://localhost').pathname
        : undefined;

      if (request.method !== 'POST' || requestPath !== path) {
        webhookDebug(
          'Rejected webhook request with unexpected route %s %s',
          request.method,
          requestPath,
        );
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'not_found' }));
        return;
      }

      const requestSecret = request.headers['x-max-bot-api-secret'];

      if (options.secret && requestSecret !== options.secret) {
        webhookDebug('Rejected webhook request with invalid secret');
        response.writeHead(401, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'invalid_secret' }));
        return;
      }

      try {
        const update = await readWebhookUpdate(request);
        webhookDebug(
          'Webhook update received %s:%s',
          update.update_type,
          update.timestamp,
        );
        await this.handleUpdate(update);
        webhookDebug(
          'Webhook update handled %s:%s',
          update.update_type,
          update.timestamp,
        );
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
      } catch (error) {
        webhookDebug('Webhook update failed', error);
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'internal_error' }));
      }
    };
  };

  createWebhook = async (options: WebhookStartOptions) => {
    const domain = this.getDomainOpts(options);
    webhookDebug('Creating webhook for %s', domain.url);
    if (options.deletePreviousWebhooks !== false) {
      await this.deletePreviousWebhooks(domain.url);
    }
    await this.subscribeWebhook(domain, options);
    return this.webhookCallback(domain.path, { secret: options.secret });
  };

  deleteWebhook = async (options: WebhookDomainOptions) => {
    const domain = this.getDomainOpts(options);
    webhookDebug('Deleting webhook %s', domain.url);
    const result = await this.api.unsubscribe(domain.url);
    webhookDebug('Webhook deleted %s', domain.url);
    return result;
  };

  private startWebhook = async (
    options: WebhookStartOptions,
    allowedUpdates?: UpdateType[],
  ) => {
    const domain = this.getDomainOpts(options);
    const callback = this.webhookCallback(domain.path, {
      secret: options.secret,
    });

    const server = http.createServer(callback);
    this.webhookServer = server;

    webhookDebug(
      'Starting webhook server on %s:%s for path %s',
      options.host ?? '0.0.0.0',
      options.port,
      domain.path,
    );

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(options.port, options.host, () => {
          server.off('error', reject);
          resolve();
        });
      });
    } catch (error) {
      this.webhookServer = undefined;
      this.webhookIsStarted = false;
      webhookDebug('Webhook server failed to start', error);
      throw error;
    }

    this.webhookIsStarted = true;

    if (options.subscribe !== false) {
      if (options.deletePreviousWebhooks !== false) {
        await this.deletePreviousWebhooks(domain.url);
      }

      await this.subscribeWebhook(domain, {
        ...options,
        allowedUpdates: options.allowedUpdates ?? allowedUpdates,
      });
    }

    webhookDebug(
      'Webhook listening on %s:%s',
      options.host ?? '0.0.0.0',
      options.port,
    );
    webhookDebug('Webhook public URL %s', domain.url);
  };

  private subscribeWebhook = async (
    domain: WebhookDomainResult,
    options: WebhookStartOptions,
  ) => {
    webhookDebug('Subscribing webhook %s', domain.url);

    await this.api.subscribe({
      url: domain.url,
      ...(options.allowedUpdates
        ? { update_types: options.allowedUpdates }
        : {}),
      ...(options.secret ? { secret: options.secret } : {}),
      ...options.extra,
    });

    webhookDebug('Webhook subscribed %s', domain.url);
  };

  private deletePreviousWebhooks = async (exceptUrl?: string) => {
    const { subscriptions } = await this.api.getSubscriptions();
    const targets = exceptUrl
      ? subscriptions.filter(({ url }) => url !== exceptUrl)
      : subscriptions;
    webhookDebug('Deleting previous webhooks, count=%d', targets.length);

    await Promise.all(
      targets.map(async ({ url }) => {
        webhookDebug('Deleting previous webhook %s', url);
        await this.api.unsubscribe(url);
      }),
    );
  };

  private getDomainOpts = ({
    domain,
    path,
  }: WebhookDomainOptions): WebhookDomainResult => {
    const parsedDomain = new URL(
      domain.startsWith('http') ? domain : `https://${domain}`,
    );
    const urlPath = normalizeWebhookPath(parsedDomain.pathname);
    const resolvedPath =
      path ?? urlPath ?? `/max-io/${this.secretPathComponent()}`;
    parsedDomain.pathname = resolvedPath;
    parsedDomain.search = '';
    parsedDomain.hash = '';

    webhookDebug('Resolved webhook domain options %o', {
      domain: parsedDomain.host,
      path: resolvedPath,
      url: parsedDomain.toString(),
    });

    return {
      domain: parsedDomain.host,
      path: resolvedPath,
      url: parsedDomain.toString(),
    };
  };

  private secretPathComponent = () => {
    return createHash('sha256')
      .update(this.token)
      .update(process.version)
      .digest('hex');
  };
}

const readWebhookUpdate = async (request: http.IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8');
  webhookDebug('Webhook request body received, length=%d', body.length);

  return JSON.parse(body) as Update;
};

const normalizeWebhookPath = (pathname: string) =>
  !pathname || pathname === '/' ? undefined : pathname;
