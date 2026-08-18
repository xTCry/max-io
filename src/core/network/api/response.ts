/** Результат однократного чтения HTTP-ответа. */
export type ParsedResponse = {
  /** Разобранное JSON-значение либо исходный текст, если тело не является JSON. */
  data: unknown;
  /** Исходное тело ответа для диагностики ошибок транспорта. */
  text: string;
  /** Удалось ли разобрать тело как JSON. */
  isJson: boolean;
};

/**
 * Читает тело ответа один раз и не выбрасывает SyntaxError для HTML или пустых
 * ответов промежуточного сервера.
 */
export const parseResponse = async (
  response: Response,
): Promise<ParsedResponse> => {
  const text = await response.text();

  if (!text) {
    return { data: undefined, text, isJson: false };
  }

  try {
    return { data: JSON.parse(text) as unknown, text, isJson: true };
  } catch {
    return { data: text, text, isJson: false };
  }
};
