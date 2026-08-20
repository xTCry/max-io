import { describe, expect, it } from 'vitest';

import { CacheRepository } from './cache-repository';

describe('CacheRepository', () => {
  it('хранит значения, обновляет снимки ключей и сортирует values', () => {
    const repository = new CacheRepository<string, { priority: number }>({
      sortingValues: (left, right) => left.priority - right.priority,
    });

    repository.set('second', { priority: 2 });
    repository.set('first', { priority: 1 });
    repository.set('second', { priority: 3 });

    expect(repository.has('first')).toBe(true);
    expect(repository.get('second')).toEqual({ priority: 3 });
    expect(repository.keys).toEqual(['second', 'first']);
    expect(repository.values).toEqual([{ priority: 1 }, { priority: 3 }]);
    expect([...repository]).toEqual([
      ['second', { priority: 3 }],
      ['first', { priority: 1 }],
    ]);
  });

  it('не перезаписывает значение через strictSet', () => {
    const repository = new CacheRepository<string, string>();
    repository.set('scene', 'active');

    expect(() => repository.strictSet('scene', 'next')).toThrow(
      'Value by scene already exists',
    );
  });

  it('возвращает falsy-значения через strictGet и сообщает об отсутствующем ключе', () => {
    const repository = new CacheRepository<string, number>();
    repository.set('step', 0);

    expect(repository.strictGet('step')).toBe(0);
    expect(() => repository.strictGet('missing')).toThrow(
      'Value by missing not found',
    );
  });
});
