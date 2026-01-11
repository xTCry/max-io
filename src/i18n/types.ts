import type { Context } from '@lib';

import { I18nContext } from './i18n-context';

export type LanguageCode = string;

export type TemplateData = Record<string, unknown>;
export type Template = (data: Readonly<TemplateData>) => string;

export type RepositoryEntry<RepositoryT> = Record<keyof RepositoryT, Template>;
export type Repository<RepositoryT> = Record<
  LanguageCode,
  Readonly<RepositoryEntry<RepositoryT>>
>;
export type RepositoryData = Record<string, Record<string, unknown> | never>;

export interface Config {
  readonly allowMissing?: boolean;
  readonly defaultLanguage: LanguageCode;
  readonly defaultLanguageOnMissing?: boolean;
  readonly directory?: string;
  readonly templateData: Readonly<TemplateData>;
  readonly sessionName: string;
  readonly useSession?: boolean;
}

export interface IContext<RepositoryT = RepositoryData> extends Context {
  readonly i18n: I18nContext<RepositoryT>;
}

export interface ISessionContext {
  __language_code?: string;
}
