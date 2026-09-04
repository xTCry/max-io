import createDebug from 'debug';

import { parseResponse } from './response';

const debug = createDebug('max-io:client');

export const DEFAULT_API_BASE_URL = 'https://platform-api.max.ru';

/** Сигнатура функции, выполняющей HTTP-запросы через Fetch API. */
export type FetchFn = typeof globalThis.fetch;

export type ClientOptions = {
  /** Базовый URL Bot API. По умолчанию используется стабильный endpoint `platform-api.max.ru`. */
  baseUrl?: string;
  /**
   * Пользовательская реализация Fetch API для запросов Bot API.
   * По умолчанию также используется при передаче файлов на upload URL.
   */
  fetch?: FetchFn;
  /**
   * Пользовательская реализация Fetch API только для передачи файлов на upload URL.
   * Если не задана, используется `fetch` либо глобальный `fetch`.
   */
  uploadFetch?: FetchFn;
};

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ReqOptions = {
  method?: HTTPMethod;
  body?: object | null;
  query?: Record<string, string | number | boolean | null | undefined>;
  path?: Record<string, string | number>;
  signal?: AbortSignal;
};

type CallOptions = {
  method: string;
  options: ReqOptions;
};

export const createClient = (token: string, options: ClientOptions = {}) => {
  const baseUrl = options.baseUrl ?? DEFAULT_API_BASE_URL;
  const fetchFn = options.fetch;
  const uploadFetch = options.uploadFetch ?? fetchFn;

  const call = async ({ method, options: callOptions }: CallOptions) => {
    const httpMethod = callOptions.method || 'GET';
    debug(
      'Call method %s /%s %o',
      httpMethod,
      method,
      getDebugRequestMeta(callOptions),
    );

    if (!token) {
      return {
        status: 401,
        data: {
          code: 'verify.token',
          message: 'Empty access_token',
        },
      };
    }

    const url = new URL(buildUrl(method, callOptions.path), baseUrl);

    Object.keys(callOptions.query ?? {}).forEach((param) => {
      const value = callOptions.query?.[param];
      if (value === undefined || value === null) return;
      url.searchParams.set(param, value.toString());
    });

    const init: RequestInit = {
      ...getResponseInit(callOptions?.body),
      method: httpMethod,
      signal: callOptions.signal,
    };
    init.headers = { ...init.headers, Authorization: token };

    const res = await (fetchFn ?? globalThis.fetch)(url.href, init);

    if (res.status === 401) {
      return {
        status: 401,
        data: {
          code: 'verify.token',
          message: 'Invalid access_token',
        },
      };
    }

    const response = await parseResponse(res);

    return {
      status: res.status,
      data: response.data,
      responseText: response.text,
    };
  };

  return { call, uploadFetch };
};

export type Client = ReturnType<typeof createClient>;

/** Возвращает только форму запроса, чтобы отладочные логи не содержали секреты. */
const getDebugRequestMeta = (options: ReqOptions) => ({
  bodyFields: options.body ? Object.keys(options.body) : [],
  queryFields: options.query ? Object.keys(options.query) : [],
  pathFields: options.path ? Object.keys(options.path) : [],
  aborted: options.signal?.aborted ?? false,
});

const getResponseInit = (body?: ReqOptions['body']): RequestInit => {
  if (!body) return {};

  return {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  };
};

const buildUrl = (baseUrl: string, path?: ReqOptions['path']): string => {
  let url = baseUrl;

  if (path) {
    Object.keys(path)?.forEach((key) => {
      const regexp = new RegExp(`{${key}}`, 'g');
      const value = encodeURIComponent(path[key].toString());
      url = url.replace(regexp, value);
    });
  }

  return url;
};
