export type ErrorResponse = {
  code: string;
  message: string;
};

export class MaxError extends Error {
  /** Исходное тело HTTP-ответа, если оно было получено. */
  public readonly responseText?: string;

  constructor(
    public readonly status: number,
    response: unknown,
    responseText?: string,
  ) {
    const normalizedResponse = normalizeErrorResponse(status, response);

    super(`${status}: ${normalizedResponse.message}`);
    this.response = normalizedResponse;
    this.responseText = responseText;
  }

  private readonly response: ErrorResponse;

  get code() {
    return this.response.code;
  }

  get description() {
    return this.response.message;
  }
}

/** Приводит нестандартный ответ прокси или upload endpoint к безопасной ошибке API. */
const normalizeErrorResponse = (
  status: number,
  response: unknown,
): ErrorResponse => {
  if (isErrorResponse(response)) {
    return response;
  }

  return {
    code: 'http.response.invalid',
    message: `Unexpected HTTP response (${status})`,
  };
};

const isErrorResponse = (value: unknown): value is ErrorResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const { code, message } = value as Partial<ErrorResponse>;

  return typeof code === 'string' && typeof message === 'string';
};
