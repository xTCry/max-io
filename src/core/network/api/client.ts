import createDebug from 'debug';

import {
  requestWithRussianCa,
  isRussianCaCertificateError,
} from './russian-ca-transport';
import {
  DEFAULT_RUSSIAN_CA_HOSTS,
  type RussianCaInstallOptions,
} from '../../../tls/russian-ca';

const debug = createDebug('max-io:client');

export const DEFAULT_API_BASE_URL = 'https://platform-api2.max.ru';

const defaultOptions = {
  baseUrl: DEFAULT_API_BASE_URL,
};

export type ClientOptions = {
  /** Базовый URL Bot API. По умолчанию используется `platform-api2.max.ru`. */
  baseUrl?: string;
  /**
   * Включает автоматическую подготовку сертификатов Минцифры для
   * `platform-api2.max.ru` после TLS-ошибки. Передайте `false`, чтобы отключить.
   */
  russianCa?: boolean | RussianCaInstallOptions;
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

type ClientCallResult = {
  status: number;
  /** Данные JSON-ответа до проверки конкретным API-модулем. */
  data: unknown;
};

export const createClient = (
  token: string,
  options: ClientOptions = {},
): {
  call: (options: CallOptions) => Promise<ClientCallResult>;
} => {
  const { baseUrl, russianCa = true } = { ...defaultOptions, ...options };

  const call = async ({ method, options: callOptions }: CallOptions) => {
    const httpMethod = callOptions.method || 'GET';
    debug(
      `Call method ${httpMethod} /${method}`,
      JSON.stringify(callOptions, null, 2),
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

    let status: number;
    let data: unknown;

    try {
      const res = await fetch(url.href, init);
      status = res.status;
      data = await res.json();
    } catch (error) {
      if (
        russianCa !== false &&
        DEFAULT_RUSSIAN_CA_HOSTS.includes(url.hostname) &&
        isRussianCaCertificateError(error)
      ) {
        debug(
          `TLS certificate for ${url.hostname} is not trusted, retrying with local Russian CA bundle`,
        );
        const result = await requestWithRussianCa(
          url,
          init,
          russianCa === true ? {} : russianCa,
        );
        status = result.status;
        data = result.data;
      } else {
        throw error;
      }
    }

    if (status === 401) {
      return {
        status: 401,
        data: {
          code: 'verify.token',
          message: 'Invalid access_token',
        },
      };
    }

    return {
      status,
      data,
    };
  };

  return { call };
};

export type Client = ReturnType<typeof createClient>;

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
      const value = path[key].toString();
      url = url.replace(regexp, value);
    });
  }

  return url;
};
