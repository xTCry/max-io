import { describe, expect, it } from 'vitest';

import { MemoryStorage } from './memory';

describe('MemoryStorage', () => {
  it('сохраняет, читает и удаляет значение', async () => {
    const storage = new MemoryStorage();

    await expect(storage.get('session')).resolves.toBeUndefined();
    await expect(storage.set('session', { visits: 1 })).resolves.toBe(true);
    await expect(storage.get('session')).resolves.toEqual({ visits: 1 });
    await expect(storage.delete('session')).resolves.toBe(true);
    await expect(storage.get('session')).resolves.toBeUndefined();
  });

  it('возвращает false при удалении отсутствующего ключа', async () => {
    const storage = new MemoryStorage();

    await expect(storage.delete('missing')).resolves.toBe(false);
  });

  it('использует переданное map-like хранилище', async () => {
    const store = new Map<string, object>();
    const storage = new MemoryStorage({ store });

    await storage.set('session', { locale: 'ru' });

    expect(store.get('session')).toEqual({ locale: 'ru' });
  });

  it('touch не изменяет значение', async () => {
    const storage = new MemoryStorage();
    await storage.set('session', { visits: 1 });

    await storage.touch('session');

    await expect(storage.get('session')).resolves.toEqual({ visits: 1 });
  });
});
