export type * from './core/network/api/types';
export type * from './core/network/api/modules';

export type ExclusiveKeys<A extends object, B extends object> = keyof Omit<
  A,
  keyof B
>;
