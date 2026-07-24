import type { Client, ReqOptions } from './client';
import { MaxError, type ErrorResponse } from './error';
import type { ApiMethods } from './modules/types';

type ApiMethodDef = {
  req: ReqOptions;
  res: unknown;
};

type ApiMethodsMap = {
  [HTTPMethod in keyof ApiMethods]: {
    [Method in keyof ApiMethods[HTTPMethod]]: ApiMethods[HTTPMethod][Method] &
      ApiMethodDef;
  };
};

type ApiCallFn<HTTPMethod extends keyof ApiMethodsMap> = <
  Method extends keyof ApiMethodsMap[HTTPMethod],
>(
  method: Method,
  options: ApiMethodsMap[HTTPMethod][Method]['req'],
) => Promise<ApiMethodsMap[HTTPMethod][Method]['res']>;

const isErrorResponse = (value: unknown): value is ErrorResponse => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
};

export class BaseApi {
  private readonly call: Client['call'];

  constructor(client: Client) {
    this.call = client.call;
  }

  private callApi = async <Response>(
    method: string,
    options: ReqOptions,
  ): Promise<Response> => {
    const result = await this.call({ method, options });

    if (result.status !== 200) {
      const response = isErrorResponse(result.data)
        ? result.data
        : {
            code: 'api.invalid_response',
            message: 'API returned an invalid error response',
          };

      throw new MaxError(result.status, response);
    }

    // JSON получают из сетевого транспорта как unknown, конкретный тип известен
    // только вызывающему API-модулю из ApiMethods.
    return result.data as Response;
  };

  protected _get: ApiCallFn<'GET'> = async (method, options) => {
    return this.callApi<ApiMethodsMap['GET'][typeof method]['res']>(method, {
      ...options,
      method: 'GET',
    });
  };

  protected _post: ApiCallFn<'POST'> = async (method, options) => {
    return this.callApi<ApiMethodsMap['POST'][typeof method]['res']>(method, {
      ...options,
      method: 'POST',
    });
  };

  protected _patch: ApiCallFn<'PATCH'> = async (method, options) => {
    return this.callApi<ApiMethodsMap['PATCH'][typeof method]['res']>(method, {
      ...options,
      method: 'PATCH',
    });
  };

  protected _put: ApiCallFn<'PUT'> = async (method, options) => {
    return this.callApi<ApiMethodsMap['PUT'][typeof method]['res']>(method, {
      ...options,
      method: 'PUT',
    });
  };

  protected _delete: ApiCallFn<'DELETE'> = async (method, options) => {
    return this.callApi<ApiMethodsMap['DELETE'][typeof method]['res']>(
      method,
      {
        ...options,
        method: 'DELETE',
      },
    );
  };
}
