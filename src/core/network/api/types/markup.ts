type MakeMarkup<Type extends string, Data extends object = {}> = {
  type: Type;
  from: number;
  length: number;
} & {
  [key in keyof Data]: Data[key];
};

export type StrongMarkup = MakeMarkup<'strong'>;

export type EmphasizedMarkup = MakeMarkup<'emphasized'>;

export type MonospacedMarkup = MakeMarkup<'monospaced'>;

export type LinkMarkup = MakeMarkup<'link', { url: string }>;

export type StrikethroughMarkup = MakeMarkup<'strikethrough'>;

export type UnderlineMarkup = MakeMarkup<'underline'>;

export type UserMentionMarkup = MakeMarkup<
  'user_mention',
  {
    user_link?: string | null;
    user_id?: number | null;
  }
>;

export type MarkupElement =
  | StrongMarkup
  | EmphasizedMarkup
  | MonospacedMarkup
  | LinkMarkup
  | StrikethroughMarkup
  | UnderlineMarkup
  | UserMentionMarkup;
