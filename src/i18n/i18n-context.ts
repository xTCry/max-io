import type {
  Config,
  Repository,
  RepositoryData,
  Template,
  TemplateData,
} from './types';

export class I18nContext<RepositoryT = RepositoryData> {
  readonly templateData: Readonly<TemplateData>;

  languageCode: string;
  shortLanguageCode: string;

  constructor(
    readonly repository: Readonly<Repository<RepositoryT>>,
    readonly config: Config,
    languageCode: string,
    templateData: Readonly<TemplateData>,
  ) {
    this.templateData = { ...config.templateData, ...templateData };

    const result = parseLanguageCode(
      this.repository,
      this.config.defaultLanguage,
      languageCode,
    );
    this.languageCode = result.languageCode;
    this.shortLanguageCode = result.shortLanguageCode;
  }

  locale(): string;
  locale(languageCode: string): void;
  locale(languageCode?: string): void | string {
    if (!languageCode) {
      return this.languageCode;
    }

    const result = parseLanguageCode(
      this.repository,
      this.config.defaultLanguage,
      languageCode,
    );
    this.languageCode = result.languageCode;
    this.shortLanguageCode = result.shortLanguageCode;
  }

  getTemplate(
    languageCode: string,
    resourceKey: keyof RepositoryT,
  ): Template | undefined {
    const repositoryEntry = this.repository[languageCode];
    return repositoryEntry?.[resourceKey];
  }

  t<T extends keyof RepositoryT>(
    resourceKey: T,
  ): [RepositoryT[T]] extends [never] ? string : never;
  t<T extends keyof RepositoryT>(
    resourceKey: T,
    templateData: Readonly<RepositoryT[T]>,
  ): string;
  t<T extends keyof RepositoryT>(
    resourceKey: T,
    templateData?: Readonly<RepositoryT[T]>,
  ): string {
    let template =
      this.getTemplate(this.languageCode, resourceKey) ??
      this.getTemplate(this.shortLanguageCode, resourceKey);

    if (!template && this.config.defaultLanguageOnMissing) {
      template = this.getTemplate(this.config.defaultLanguage, resourceKey);
    }

    if (!template && this.config.allowMissing) {
      template = () => resourceKey as string;
    }

    if (!template) {
      throw new Error(
        `max-io-i18n: '${this.languageCode}.${resourceKey as string}' not found`,
      );
    }

    const data: TemplateData = {
      ...this.templateData,
      ...templateData,
    };

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'function') {
        data[key] = value.bind(this);
      }
    }

    let content = '';
    try {
      content = template(data);
    } catch (err) {
      throw new Error(
        `max-io-i18n: '${this.languageCode}.${resourceKey as string}' compile error`,
        { cause: err },
      );
    }

    return content;
  }
}

function parseLanguageCode<RepositoryT>(
  repository: Readonly<Repository<RepositoryT>>,
  defaultLanguage: string,
  languageCode: string,
) {
  let code = languageCode.toLowerCase();
  const shortCode = shortLanguageCodeFromLong(code);

  if (!repository[code] && !repository[shortCode]) {
    code = defaultLanguage;
  }

  return {
    languageCode: code,
    shortLanguageCode: shortLanguageCodeFromLong(code),
  };
}

function shortLanguageCodeFromLong(languageCode: string): string {
  return languageCode.split('-')[0]!;
}
