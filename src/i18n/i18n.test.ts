import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { Context } from '../core/context';
import type { MiddlewareFn } from '../core/middleware';
import type { BotStartedUpdate } from '../core/network/api';
import { I18n } from './i18n';
import type { IContext } from './types';

type I18nTestContext = IContext & {
  session?: { __language_code?: string };
};

const temporaryDirectories: string[] = [];

const createUpdate = (locale?: string): BotStartedUpdate => ({
  update_type: 'bot_started',
  timestamp: 1_700_000_000_000,
  chat_id: 42,
  user_locale: locale,
  user: {
    user_id: 7,
    first_name: 'Test',
    name: 'Test',
    username: null,
    is_bot: false,
  },
});

const createContext = (locale?: string) =>
  new Context(createUpdate(locale), {} as never) as unknown as I18nTestContext;

const createLocalesDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'max-io-i18n-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('I18n', () => {
  it('загружает YAML и JSON локали, приводя ключи к нижнему регистру', () => {
    const directory = createLocalesDirectory();
    writeFileSync(
      join(directory, 'RU.yml'),
      'start:\n  hello: "Привет, ${name}!"\n',
    );
    writeFileSync(join(directory, 'en.json'), '{"start":{"hello":"Hello"}}');
    const i18n = new I18n({ directory });

    expect(i18n.availableLocales()).toEqual(['ru', 'en']);
    expect(i18n.resourceKeys('ru')).toEqual(['start.hello']);
    expect(i18n.t('ru', 'start.hello', { name: 'Max' })).toBe('Привет, Max!');
    expect(i18n.t('en', 'start.hello')).toBe('Hello');
  });

  it('выбирает short locale и fallback-язык', () => {
    const i18n = new I18n({
      defaultLanguage: 'en',
      defaultLanguageOnMissing: true,
    });
    i18n.loadLocale('en', {
      common: { title: 'Title', onlyEnglish: 'Only English' },
    });
    i18n.loadLocale('ru', { common: { title: 'Заголовок' } });

    expect(i18n.t('ru-RU', 'common.title')).toBe('Заголовок');
    expect(i18n.t('ru', 'common.onlyEnglish')).toBe('Only English');
  });

  it('обрабатывает interpolation и pluralize в контексте локали', () => {
    const i18n = new I18n();
    i18n.loadLocale('ru', {
      greeting: 'Привет, ${name}!',
      count: '${pluralize(count, "сообщение", "сообщения", "сообщений")}',
    });

    expect(i18n.t('ru', 'greeting', { name: 'Max' })).toBe('Привет, Max!');
    expect(i18n.t('ru', 'count', { count: 5 })).toBe('5 сообщений');
  });

  it('возвращает ключ или ошибку для отсутствующего перевода по конфигурации', () => {
    const permissive = new I18n();
    const strict = new I18n({ allowMissing: false });

    expect(permissive.t('ru', 'missing.key')).toBe('missing.key');
    expect(() => strict.t('ru', 'missing.key')).toThrow(
      "max-io-i18n: 'ru.missing.key' not found",
    );
  });

  it('middleware берёт язык update и сохраняет сменённую locale в session', async () => {
    const i18n = new I18n({ useSession: true });
    i18n.loadLocale('ru', { title: 'Заголовок' });
    i18n.loadLocale('en', { title: 'Title' });
    const context = createContext('ru-RU');
    context.session = {};
    const middleware = i18n.middleware as MiddlewareFn<I18nTestContext>;

    await middleware(context, async () => {
      expect(context.i18n.locale()).toBe('ru-ru');
      expect(context.i18n.t('title')).toBe('Заголовок');
      context.i18n.locale('en');
    });

    expect(context.session).toEqual({ __language_code: 'en' });
  });

  it('предпочитает язык из session перед user_locale update', async () => {
    const i18n = new I18n({ useSession: true });
    i18n.loadLocale('ru', { title: 'Заголовок' });
    i18n.loadLocale('en', { title: 'Title' });
    const context = createContext('ru');
    context.session = { __language_code: 'en' };
    const middleware = i18n.middleware as MiddlewareFn<I18nTestContext>;

    await middleware(context, async () => {
      expect(context.i18n.locale()).toBe('en');
      expect(context.i18n.t('title')).toBe('Title');
    });
  });
});
