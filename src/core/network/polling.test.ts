import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Api } from '../api';
import type { BotStoppedUpdate } from './api';
import { Polling } from './polling';

const createUpdate = (): BotStoppedUpdate => ({
  update_type: 'bot_stopped',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createApi = (getUpdates: Api['getUpdates']): Pick<Api, 'getUpdates'> => ({
  getUpdates,
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Polling', () => {
  it('передаёт marker следующему запросу и обрабатывает полученный update', async () => {
    const getUpdates = vi
      .fn<Api['getUpdates']>()
      .mockResolvedValueOnce({ updates: [createUpdate()], marker: 10 })
      .mockImplementationOnce(async (...args) => {
        const signal = args[1]?.signal;
        await new Promise<void>((resolve) => {
          signal?.addEventListener('abort', () => resolve(), { once: true });
        });

        throw new DOMException('Aborted', 'AbortError');
      });
    const polling = new Polling(createApi(getUpdates) as Api);
    const handleUpdate = vi.fn(async () => undefined);

    const loop = polling.loop(handleUpdate);
    await vi.waitFor(() => expect(handleUpdate).toHaveBeenCalledTimes(1));

    polling.stop();
    await loop;

    expect(getUpdates).toHaveBeenNthCalledWith(
      2,
      [],
      expect.objectContaining({ marker: 10 }),
    );
    expect(polling.marker).toBe(10);
  });

  it('повторяет только ошибку native fetch с нарастающей задержкой', async () => {
    vi.useFakeTimers();

    const getUpdates = vi
      .fn<Api['getUpdates']>()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockImplementationOnce(async (...args) => {
        const signal = args[1]?.signal;
        await new Promise<void>((resolve) => {
          signal?.addEventListener('abort', () => resolve(), { once: true });
        });

        throw new DOMException('Aborted', 'AbortError');
      });
    const polling = new Polling(createApi(getUpdates) as Api);
    const loop = polling.loop(async () => undefined);

    await flushPromises();
    expect(getUpdates).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(getUpdates).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(getUpdates).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(getUpdates).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(getUpdates).toHaveBeenCalledTimes(3);

    polling.stop();
    await loop;
  });

  it('не воспринимает TypeError из middleware как сетевую ошибку', async () => {
    const middlewareError = new TypeError('handler failed');
    const getUpdates = vi.fn<Api['getUpdates']>().mockResolvedValue({
      updates: [createUpdate()],
      marker: 10,
    });
    const polling = new Polling(createApi(getUpdates) as Api);

    await expect(
      polling.loop(async () => Promise.reject(middlewareError)),
    ).rejects.toBe(middlewareError);

    expect(getUpdates).toHaveBeenCalledTimes(1);
  });
});
