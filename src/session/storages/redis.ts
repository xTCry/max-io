import createDebug from 'debug';
import type {
  Redis as IORedisClient,
  Cluster as IORedisCluster,
  RedisOptions,
} from 'ioredis';

import { ISessionStorage } from './storage';

const debug = createDebug('max-io:redis-store');

type Client = IORedisClient | IORedisCluster;
type RedisCtor = new (...args: any[]) => Client;
const loadIORedis = () => {
  try {
    const mod = require('ioredis');
    return (mod?.default ?? mod) as RedisCtor;
  } catch {
    throw new Error('max-io/lib/session: ioredis is not installed');
  }
};

const isRedisClient = (v: unknown): v is Client =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as any).get === 'function' &&
  typeof (v as any).set === 'function' &&
  typeof (v as any).del === 'function' &&
  typeof (v as any).expire === 'function';

export type IRedisStorageOptions = {
  redis?: Omit<RedisOptions, 'keyPrefix'> | Client;
  /** Время жизни сессии в секундах */
  ttl?: number;
  keyPrefix?: RedisOptions['keyPrefix'];
};

export class RedisStorage implements ISessionStorage {
  public readonly client: Client;
  public readonly ttl: number = 0;

  constructor(options: IRedisStorageOptions = {}) {
    if (options.ttl) this.ttl = options.ttl;

    if (isRedisClient(options.redis)) {
      this.client = options.redis;
      return;
    }

    const RedisCtor = loadIORedis();

    this.client = new RedisCtor({
      ...(options.redis ?? {}),
      keyPrefix: options.keyPrefix || 'max-io:session:',
    });
  }

  public async get(key: string): Promise<object | undefined> {
    const raw = await this.client.get(key);
    const value = raw ? JSON.parse(raw) : undefined;
    debug('session state', key, value);
    return value;
  }

  public async set(key: string, value: object): Promise<boolean> {
    const json = JSON.stringify(value);
    if (!json || json === '{}') return this.delete(key);

    debug('save session', key, json);
    const ok = (await this.client.set(key, json)) === 'OK';

    if (this.ttl) {
      debug('set session ttl', this.ttl);
      await this.client.expire(key, this.ttl);
    }

    return ok;
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
