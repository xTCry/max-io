import { Middleware } from '@lib';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

import { I18nContext } from './i18n-context';
import type {
  Config,
  IContext,
  ISessionContext,
  LanguageCode,
  Repository,
  RepositoryData,
  TemplateData,
} from './types';
import { compileTemplates } from './util/compile-template';
import { pluralize } from './util/pluralize';
import { tableize } from './util/tabelize';

export class I18n<
  RepositoryT = RepositoryData,
  Ctx extends IContext<RepositoryT> = IContext<RepositoryT>,
> {
  repository: Repository<RepositoryT> = {};
  readonly config: Config;

  constructor(config: Partial<Config> = {}) {
    this.config = {
      defaultLanguage: 'ru',
      sessionName: 'session',
      allowMissing: true,
      templateData: { pluralize },
      ...config,
    };
    if (this.config.directory) {
      this.loadLocales(this.config.directory);
    }
  }

  loadLocales(directory: string) {
    if (!fs.existsSync(directory)) {
      throw new Error(`Locales directory '${directory}' not found`);
    }

    const files = fs.readdirSync(directory);
    for (const fileName of files) {
      const extension = path.extname(fileName);
      const languageCode = path.basename(fileName, extension).toLowerCase();
      const fileContent = fs.readFileSync(
        path.resolve(directory, fileName),
        'utf8',
      );
      if (extension === '.yaml' || extension === '.yml') {
        const data = yaml.load(fileContent) as Record<string, unknown>;
        this.loadLocale(languageCode, data);
      } else if (extension === '.json') {
        const data = JSON.parse(fileContent) as Record<string, unknown>;
        this.loadLocale(languageCode, data);
      }
    }
  }

  loadLocale(
    languageCode: LanguageCode,
    i18nData: Readonly<Record<string, unknown>>,
  ): void {
    const tableized = tableize(i18nData);

    const ensureStringData: Record<string, string> = {};
    for (const [key, value] of Object.entries(tableized)) {
      ensureStringData[key] = String(value);
    }

    const language = languageCode.toLowerCase();
    this.repository[language] = {
      ...this.repository[language],
      ...compileTemplates(ensureStringData),
    };
  }

  resetLocale(languageCode?: LanguageCode) {
    if (languageCode) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.repository[languageCode.toLowerCase()];
    } else {
      this.repository = {};
    }
  }

  availableLocales(): LanguageCode[] {
    return Object.keys(this.repository);
  }

  resourceKeys(languageCode: LanguageCode) {
    const language = languageCode.toLowerCase();
    return Object.keys(this.repository[language] ?? {}) as string[];
  }

  missingKeys(
    languageOfInterest: LanguageCode,
    referenceLanguage = this.config.defaultLanguage,
  ): string[] {
    const interest = this.resourceKeys(languageOfInterest);
    const reference = this.resourceKeys(referenceLanguage);

    return reference.filter((ref) => !interest.includes(ref));
  }

  overspecifiedKeys(
    languageOfInterest: LanguageCode,
    referenceLanguage = this.config.defaultLanguage,
  ): string[] {
    return this.missingKeys(referenceLanguage, languageOfInterest);
  }

  translationProgress(
    languageOfInterest: LanguageCode,
    referenceLanguage = this.config.defaultLanguage,
  ): number {
    const reference = this.resourceKeys(referenceLanguage).length;
    const missing = this.missingKeys(
      languageOfInterest,
      referenceLanguage,
    ).length;

    return (reference - missing) / reference;
  }

  createContext(
    languageCode: LanguageCode,
    templateData: Readonly<TemplateData>,
  ) {
    return new I18nContext(
      this.repository,
      this.config,
      languageCode,
      templateData,
    );
  }

  public get middleware(): Middleware<Ctx> {
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    return async (ctx, next) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const session: ISessionContext | undefined =
        this.config.useSession && ctx[this.config.sessionName];

      const languageCode =
        session?.__language_code ??
        (('user_locale' in ctx.update &&
          (ctx.update.user_locale as unknown as string)) ||
          this.config.defaultLanguage);

      // @ts-expect-error writing to readonly property
      ctx.i18n = new I18nContext(this.repository, this.config, languageCode, {
        ctx,
      });

      await next();

      if (session) {
        session.__language_code = ctx.i18n.locale();
      }
    };
  }

  t<T extends keyof RepositoryT>(
    languageCode: LanguageCode,
    resourceKey: keyof RepositoryT,
    templateData?: Readonly<RepositoryT[T]>,
  ): string | never {
    const i18nContext = this.createContext(languageCode, templateData || {});
    return templateData
      ? i18nContext.t(resourceKey, templateData)
      : i18nContext.t(resourceKey);
  }
}
