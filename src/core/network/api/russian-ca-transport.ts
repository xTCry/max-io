import { Agent, type AgentOptions, request } from 'node:https';
import type {
  ClientRequest,
  IncomingHttpHeaders,
  RequestOptions,
} from 'node:http';

import {
  isRussianCaCertificateError,
  resolveRussianCaList,
  type RussianCaInstallOptions,
} from '../../../tls/russian-ca';

type JsonResponse = {
  status: number;
  data: unknown;
};

type RussianCaRequestOptions = RussianCaInstallOptions & {
  signal?: AbortSignal;
};

type HeadersWithForEach = {
  forEach(callback: (value: string, name: string) => void): void;
};

const toNodeHeaders = (headers?: HeadersInit): IncomingHttpHeaders => {
  const result: IncomingHttpHeaders = {};

  if (!headers) return result;

  if (Array.isArray(headers)) {
    for (const [name, value] of headers) {
      result[name] = value;
    }

    return result;
  }

  if (
    typeof (headers as HeadersWithForEach).forEach === 'function'
  ) {
    (headers as HeadersWithForEach).forEach((value, name) => {
      result[name] = value;
    });

    return result;
  }

  Object.assign(result, headers);

  return result;
};

/**
 * Выполняет JSON-запрос через локальный CA-bundle. Транспорт применяется только
 * после ошибки проверки сертификата в стандартном `fetch`.
 */
export const requestWithRussianCa = async (
  url: URL,
  init: RequestInit,
  options: RussianCaRequestOptions = {},
): Promise<JsonResponse> => {
  const ca = await resolveRussianCaList({
    ...options,
    hosts: [url.hostname],
  });

  if (!ca) {
    throw new Error(
      `Node.js already trusts the certificate for ${url.hostname}, Russian CA transport is not required`,
    );
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const body = typeof init.body === 'string' ? init.body : undefined;
    const headers = toNodeHeaders(init.headers ?? {});

    if (body !== undefined && headers['content-length'] === undefined) {
      headers['content-length'] = Buffer.byteLength(body).toString();
    }

    const agent = new Agent({
      ca,
      keepAlive: true,
    } as AgentOptions);
    const requestOptions: RequestOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: init.method,
      headers,
      agent,
    };
    const requestInstance: ClientRequest = request(
      url,
      requestOptions,
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        response.once('error', rejectOnce);
        response.once('end', () => {
          try {
            const content = Buffer.concat(chunks).toString('utf8');

            const result = {
              status: response.statusCode ?? 0,
              data: JSON.parse(content),
            };
            resolveOnce(result);
          } catch (error) {
            rejectOnce(error);
          }
        });
      },
    );
    let settled = false;

    const abort = (): void => {
      const error =
        init.signal?.reason instanceof Error
          ? init.signal.reason
          : new Error('The request was aborted');

      requestInstance.destroy(error);
    };
    const cleanup = (): void => {
      init.signal?.removeEventListener('abort', abort);
      requestInstance.removeListener('error', rejectOnce);
      agent.destroy();
    };
    const resolveOnce = (value: JsonResponse): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolvePromise(value);
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      rejectPromise(error);
    };

    if (init.signal?.aborted) {
      rejectOnce(
        init.signal.reason instanceof Error
          ? init.signal.reason
          : new Error('The request was aborted'),
      );
      return;
    }

    init.signal?.addEventListener('abort', abort, { once: true });
    requestInstance.once('error', rejectOnce);

    if (body !== undefined) {
      requestInstance.write(body);
    }

    requestInstance.end();
  });
};

export { isRussianCaCertificateError };
