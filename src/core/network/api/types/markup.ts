/** Базовая структура элемента разметки текста сообщения. */
type MakeMarkup<Type extends string, Data extends object = {}> = {
  /** Тип элемента разметки. */
  type: Type;
  /** Индекс начала элемента в тексте, нумерация с нуля. */
  from: number;
  /** Длина фрагмента текста, к которому применяется разметка. */
  length: number;
} & {
  [key in keyof Data]: Data[key];
};

/** Жирный текст. */
export type StrongMarkup = MakeMarkup<'strong'>;

/** Курсивный текст. */
export type EmphasizedMarkup = MakeMarkup<'emphasized'>;

/** Моноширинный текст. */
export type MonospacedMarkup = MakeMarkup<'monospaced'>;

/** Ссылка в тексте сообщения. */
export type LinkMarkup = MakeMarkup<'link', { url: string }>;

/** Зачёркнутый текст. */
export type StrikethroughMarkup = MakeMarkup<'strikethrough'>;

/** Подчёркнутый текст. */
export type UnderlineMarkup = MakeMarkup<'underline'>;

/** Заголовок. */
export type HeadingMarkup = MakeMarkup<'heading'>;

/** Выделенный текст. */
export type HighlightedMarkup = MakeMarkup<'highlighted'>;

/** Цитата. */
export type QuoteMarkup = MakeMarkup<'quote'>;

/** Упоминание пользователя в тексте сообщения. */
export type UserMentionMarkup = MakeMarkup<
  'user_mention',
  {
    /** `@username` упомянутого пользователя. */
    user_link?: string | null;
    /** ID упомянутого пользователя, если упоминание задано без username. */
    user_id?: number | null;
  }
>;

/** Элемент разметки текста входящего сообщения. */
export type MarkupElement =
  | StrongMarkup
  | EmphasizedMarkup
  | MonospacedMarkup
  | LinkMarkup
  | StrikethroughMarkup
  | UnderlineMarkup
  | HeadingMarkup
  | HighlightedMarkup
  | QuoteMarkup
  | UserMentionMarkup;
