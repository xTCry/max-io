import createDebug from 'debug';

import type { Api } from '../api';
import { MaxError, Update, UpdateType } from './api';

const debug = createDebug('max-io:polling');

const RETRY_INTERVAL = 5_000; // ms

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
    while (!this.abortController.signal.aborted) {
      try {
        const { updates, marker } = await this.api.getUpdates(
          this.allowedUpdates,
          { marker: this.state.marker },
        );
        this.state.marker = marker ?? undefined;
        await Promise.all(updates.map(handleUpdate));
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') return;
          if (
            err.name === 'FetchError' ||
            (err instanceof MaxError && err.status === 429) ||
            (err instanceof MaxError && err.status >= 500)
          ) {
            debug(
              `Failed to fetch updates, retrying after ${RETRY_INTERVAL}ms.`,
              err,
            );
            await new Promise((resolve) => {
              setTimeout(resolve, RETRY_INTERVAL);
            });
            continue;
          }
        }
        throw err;
      }
    }
    debug('Long polling is done');
  };

  stop = () => {
    debug('Stopping long polling');
    this.abortController.abort();
  };
}
