import * as Redis from 'ioredis';
import createDebug from 'debug';

import { ISessionStorage } from './storage';

export type IRedisStorageOptions = {
  redis?: Omit<Redis.RedisOptions, 'keyPrefix'> | Redis.Redis;
  ttl?: number;
  keyPrefix?: Redis.RedisOptions['keyPrefix'];
};

const debug = createDebug('max-io:redis-store');

export class RedisStorage implements ISessionStorage {
  public readonly client: Redis.Redis;
  public readonly ttl: number = 0;

  constructor(options: IRedisStorageOptions = {}) {
    if (options.ttl) {
      this.ttl = options.ttl;
    }

    if (options.redis instanceof Redis.Redis) {
      this.client = options.redis;
    } else {
      this.client = new Redis.Redis({
        ...options.redis,
        keyPrefix: options.keyPrefix || 'max-io:session:',
      });
    }
  }

  public async get(key: string): Promise<object | undefined> {
    const value = JSON.parse((await this.client.get(key)) || '{}');
    debug('session state', key, value);
    return value;
  }

  public async set(key: string, value: object): Promise<boolean> {
    const json = JSON.stringify(value);
    if (!json || json === '{}') {
      return await this.delete(key);
    }

    debug('save session', key, json);
    const result = (await this.client.set(key, json)) === 'OK';
    if (this.ttl) {
      debug('set session ttl', this.ttl);
      await this.client.expire(key, this.ttl);
    }
    return result;
  }

  public async delete(key: string): Promise<boolean> {
    debug('delete session', key);
    return (await this.client.del(key)) === 1;
  }

  public async touch(key: string): Promise<void> {
    if (!this.ttl) return;
    debug('touch session', key, this.ttl);
    await this.client.expire(key, this.ttl);
  }
}
