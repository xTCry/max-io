import { describe, expect, it, vi } from 'vitest';

import { RedisStorage } from './redis';

const createClient = () => ({
  get: vi.fn<(key: string) => Promise<string | null>>(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
  expire: vi.fn(async () => 1),
});

describe('RedisStorage', () => {
  it('читает и разбирает JSON сессии', async () => {
    const client = createClient();
    client.get.mockResolvedValue('{"visits":2}');
    const storage = new RedisStorage({ redis: client as never });

    await expect(storage.get('session')).resolves.toEqual({ visits: 2 });
    expect(client.get).toHaveBeenCalledWith('session');
  });

  it('возвращает undefined для отсутствующей сессии', async () => {
    const client = createClient();
    const storage = new RedisStorage({ redis: client as never });

    await expect(storage.get('missing')).resolves.toBeUndefined();
  });

  it('сохраняет JSON и устанавливает TTL', async () => {
    const client = createClient();
    const storage = new RedisStorage({ redis: client as never, ttl: 60 });

    await expect(storage.set('session', { locale: 'ru' })).resolves.toBe(true);

    expect(client.set).toHaveBeenCalledWith('session', '{"locale":"ru"}');
    expect(client.expire).toHaveBeenCalledWith('session', 60);
  });

  it('удаляет пустую сессию вместо сохранения', async () => {
    const client = createClient();
    const storage = new RedisStorage({ redis: client as never });

    await expect(storage.set('session', {})).resolves.toBe(true);

    expect(client.set).not.toHaveBeenCalled();
    expect(client.del).toHaveBeenCalledWith('session');
  });

  it('продлевает TTL только если он задан', async () => {
    const withTtl = createClient();
    const withoutTtl = createClient();

    await new RedisStorage({ redis: withTtl as never, ttl: 60 }).touch(
      'session',
    );
    await new RedisStorage({ redis: withoutTtl as never }).touch('session');

    expect(withTtl.expire).toHaveBeenCalledWith('session', 60);
    expect(withoutTtl.expire).not.toHaveBeenCalled();
  });

  it('пробрасывает ошибку невалидного JSON из Redis', async () => {
    const client = createClient();
    client.get.mockResolvedValue('{invalid');
    const storage = new RedisStorage({ redis: client as never });

    await expect(storage.get('session')).rejects.toThrow(SyntaxError);
  });
});
