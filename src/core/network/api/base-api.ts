import type { Client, ReqOptions } from './client';
import { MaxError } from './error';
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

export class BaseApi {
  private readonly call: Client['call'];

  constructor(client: Client) {
    this.call = client.call;
  }

  private callApi = async (method: string, options: ReqOptions) => {
    const result = await this.call({ method, options });
    if (result.status !== 200) {
      throw new MaxError(result.status, result.data);
    }
    return result.data;
  };

  protected _get: ApiCallFn<'GET'> = async (method, options) => {
    return this.callApi(method, { ...options, method: 'GET' });
  };

  protected _post: ApiCallFn<'POST'> = async (method, options) => {
    return this.callApi(method, { ...options, method: 'POST' });
  };

  protected _patch: ApiCallFn<'PATCH'> = async (method, options) => {
    return this.callApi(method, { ...options, method: 'PATCH' });
  };

  protected _put: ApiCallFn<'PUT'> = async (method, options) => {
    return this.callApi(method, { ...options, method: 'PUT' });
  };

  protected _delete: ApiCallFn<'DELETE'> = async (method, options) => {
    return this.callApi(method, { ...options, method: 'DELETE' });
  };
}
