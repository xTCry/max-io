export * from './core/network/api/types';

export type ExclusiveKeys<A extends object, B extends object> = keyof Omit<
  A,
  keyof B
>;
