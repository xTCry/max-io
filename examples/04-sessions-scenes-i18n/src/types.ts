import type * as max from 'max-io/types';
import type { Context } from 'max-io';
import type {
  I18nContext,
  ISessionContext as ISessionContextI18n,
} from 'max-io/lib/i18n';
import type {
  ISessionContainer,
  WithScene,
  WithStepScene,
} from 'max-io/lib/scene';
import type { ISessionContext as ISessionContextBase } from 'max-io/lib/session';

export type LocaleSchema = {
  'start.hello': { name?: string; visits: number };
  'help.content': never;
  'fallback.content': never;
  'button.cancel': never;
  'button.save': never;
  'button.back': never;
  'button.next': never;
  'scene.cancelled': never;
  'scene.intro.name': never;
  'scene.intro.age': { name?: string };
  'scene.intro.invalidAge': never;
  'scene.intro.done': { name?: string; age: number };
  'scene.extra.started': never;
  'scene.extra.chooseLanguage': never;
  'scene.extra.chooseFrequency': never;
  'scene.extra.writeNote': never;
  'scene.extra.writeNoteAgain': { note: string };
  'scene.extra.confirm': { language: string; frequency: string; note: string };
  'scene.extra.noteRequired': never;
  'scene.extra.saved': never;
  'scene.extra.dialogOnly': never;
  'scene.extra.pickLanguageFirst': never;
  'scene.extra.pickFrequencyFirst': never;
  'scene.extra.cancelled': never;
  'scene.extra.language.ru': never;
  'scene.extra.language.en': never;
  'scene.extra.frequency.daily': never;
  'scene.extra.frequency.weekly': never;
};

export enum SceneType {
  Intro = 'scene:intro',
  Extra = 'scene:extra',
}

export type IntroSceneState = {
  name?: string;
  age?: number;
};

export type ExtraSceneState = {
  language?: 'ru' | 'en';
  frequency?: 'daily' | 'weekly';
  note?: string;
  noteMid?: string;
};

export type ExtraSettings = Required<
  Pick<ExtraSceneState, 'language' | 'frequency' | 'note'>
>;

//

export type AnyObj = Record<string, unknown>;

// Общая session приложения.
export type AppSession<SceneState extends AnyObj = {}> = ISessionContextBase &
  ISessionContextI18n &
  ISessionContainer<SceneState> & {
    visits?: number;
    realName?: string;
    tempMids?: string[];
    extraSettings?: ExtraSettings;
  };

export type AppState = {
  requestId?: string;
  isAdmin?: boolean;
};

export type CombinedContext<SceneState extends AnyObj = {}> = {
  state: AppState;
  session: AppSession<SceneState>;
  i18n: I18nContext<LocaleSchema>;
};

type BaseContext<
  U extends max.Update = max.Update,
  SceneState extends AnyObj = {},
> =
  // * Исключаем базовый `state` из контекста, т.к. он `Record<string, unknownn>`, который может спутать типизацию
  CombinedContext<SceneState> & Omit<Context<U>, 'state'>;

export type AppContext<
  U extends max.Update = max.Update,
  SceneState extends AnyObj = {},
> = WithScene<BaseContext<U, SceneState>, 'session'>;

// Тип для слушателя новых и измененных сообщений
export type IMessageContext = AppContext<
  max.MessageCreatedUpdate | max.MessageEditedUpdate
>;
// Тип для слушателя событий сообщения
export type ICallbackContext = AppContext<max.MessageCallbackUpdate>;

// * Используется при создании `new StepScene<>`
export type IStepContext<
  S extends AnyObj = {},
  U extends max.Update = max.Update,
  // | max.MessageCreatedUpdate
  // | max.MessageEditedUpdate
  // | max.MessageCallbackUpdate,
> = WithStepScene<AppContext<U, S>, 'session'>;
