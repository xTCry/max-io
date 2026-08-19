import createDebug from 'debug';

import type { Api } from '../api';
import { MaxError, Update, UpdateType } from './api';

const debug = createDebug('max-io:polling');

const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60_000;

export type PollingState = {
  marker?: number;
};

export class Polling {
  private readonly abortController = new AbortController();

  constructor(
    private readonly api: Api,
    private readonly allowedUpdates: UpdateType[] = [],
    private readonly state: PollingState = {},
  ) {}

  get marker() {
    return this.state.marker;
  }

  setMarker(marker?: number) {
    this.state.marker = marker;
    debug('Polling marker set to %o', marker);
  }

  loop = async (handleUpdate: (updates: Update) => Promise<void>) => {
    debug('Starting long polling');

    let retryDelay = BASE_RETRY_DELAY_MS;

    while (!this.abortController.signal.aborted) {
      let updates: Update[];
      let marker: number | null;

      try {
        ({ updates, marker } = await this.api.getUpdates(this.allowedUpdates, {
          marker: this.state.marker,
          signal: this.abortController.signal,
        }));
      } catch (err) {
        if (isAbortError(err)) return;

        if (isRetriablePollingError(err)) {
          debug(
            'Failed to fetch updates, retrying after %dms: %O',
            retryDelay,
            err,
          );
          await waitForRetry(this.abortController.signal, retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
          continue;
        }

        throw err;
      }

      // Сброс задержки происходит после успешного HTTP-запроса, до middleware.
      // Поэтому ошибка пользовательского обработчика не будет принята за сетевую.
      retryDelay = BASE_RETRY_DELAY_MS;
      this.state.marker = marker ?? undefined;
      await Promise.all(updates.map(handleUpdate));
    }
    debug('Long polling is done');
  };

  stop = () => {
    debug('Stopping long polling');
    this.abortController.abort();
  };
}

/** Возвращает true только для временных ошибок транспорта или API. */
const isRetriablePollingError = (error: unknown): boolean => {
  if (error instanceof MaxError) {
    return error.status === 429 || error.status >= 500;
  }

  return (
    error instanceof Error &&
    (error.name === 'FetchError' || isNativeFetchNetworkError(error))
  );
};

/** Native fetch в Node.js сообщает о сетевых сбоях через TypeError: fetch failed. */
const isNativeFetchNetworkError = (error: Error) => {
  return error instanceof TypeError && error.message === 'fetch failed';
};

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === 'AbortError';
};

/** Ожидает следующий polling-запрос и завершается сразу при остановке бота. */
const waitForRetry = (signal: AbortSignal, delay: number) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const onAbort = () => {
      clearTimeout(timeout);
      resolve();
    };

    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);

    signal.addEventListener('abort', onAbort, { once: true });
  });
