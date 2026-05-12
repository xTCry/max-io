import {
  AudioAttachment,
  FileAttachment,
  ImageAttachment,
  VideoAttachment,
} from './helpers/attachments';
import type { MaybeArray } from './helpers/types';
import { Upload } from './helpers/upload';
import type {
  UploadAudioOptions,
  UploadFileOptions,
  UploadImageOptions,
  UploadVideoOptions,
} from './helpers/upload';
import {
  GetMessagesExtra,
  MaxError,
  RawApi,
  SenderAction,
} from './network/api';
import type {
  AnswerOnCallbackExtra,
  BotCommand,
  Client,
  DeleteMessageExtra,
  EditMessageExtra,
  EditMyInfoDTO,
  FlattenReq,
  GetUpdatesDTO,
  SendMessageExtra,
  SubscribeExtra,
  UpdateType,
} from './network/api';
import type {
  ChatAdmin,
  EditChatExtra,
  GetAllChatsExtra,
  GetChatMembersExtra,
  PinMessageExtra,
  RemoveChatMemberExtra,
} from './network/api/modules';

export class Api {
  raw: RawApi;

  upload: Upload;

  constructor(client: Client) {
    this.raw = new RawApi(client);
    this.upload = new Upload(this);
  }

  getMyInfo = async () => {
    return this.raw.bots.getMyInfo();
  };

  editMyInfo = async (extra: FlattenReq<EditMyInfoDTO>) => {
    return this.raw.bots.editMyInfo(extra);
  };

  setMyCommands = async (commands: BotCommand[]) => {
    return this.editMyInfo({ commands });
  };

  deleteMyCommands = async () => {
    return this.editMyInfo({ commands: [] });
  };

  getAllChats = async (extra: GetAllChatsExtra = {}) => {
    return this.raw.chats.getAll(extra);
  };

  getChat = async (id: number) => {
    return this.raw.chats.getById({ chat_id: id });
  };

  /**
   * @deprecated Max Bot API удалил lookup чата по публичной ссылке.
   * Метод оставлен временно для мягкой миграции и всегда возвращает ошибку `410 Gone`.
   */
  getChatByLink = async (_link: string): Promise<never> => {
    throw new MaxError(410, {
      code: 'chat.link.removed',
      message: 'Chat lookup by public link was removed from Max Bot API.',
    });
  };

  /**
   * Изменяет информацию группового чата.
   *
   * @param chatId ID группового чата. У групповых чатов ID может быть отрицательным.
   * @param extra Новые поля чата: название, иконка, закреплённое сообщение и настройки уведомлений.
   */
  editChatInfo = async (chatId: number, extra: EditChatExtra) => {
    return this.raw.chats.edit({ chat_id: chatId, ...extra });
  };

  /**
   * Удаляет групповой чат для всех участников.
   *
   * @param chatId ID группового чата. У групповых чатов ID может быть отрицательным.
   * @remarks Для успешного удаления у бота должно быть право `delete`. Если прав не хватает,
   * сервер может вернуть `success: false` без HTTP-ошибки.
   */
  deleteChat = async (chatId: number) => {
    return this.raw.chats.delete({ chat_id: chatId });
  };

  /**
   * Отправляет сообщение в чат.
   *
   * @param chatId ID чата. У групповых чатов ID может быть отрицательным.
   * @param text Текст сообщения. Ограничение API: до `4000` символов.
   * @param extra Вложения, ссылка на сообщение, формат текста, уведомления и `AbortSignal`.
   */
  sendMessageToChat = async (
    chatId: number,
    text: string,
    extra?: SendMessageExtra,
  ) => {
    const { message } = await this.raw.messages.send({
      chat_id: chatId,
      text,
      ...extra,
    });
    return message;
  };

  /**
   * Отправляет сообщение пользователю.
   *
   * @param userId ID пользователя-получателя.
   * @param text Текст сообщения. Ограничение API: до `4000` символов.
   * @param extra Вложения, ссылка на сообщение, формат текста, уведомления и `AbortSignal`.
   */
  sendMessageToUser = async (
    userId: number,
    text: string,
    extra?: SendMessageExtra,
  ) => {
    const { message } = await this.raw.messages.send({
      user_id: userId,
      text,
      ...extra,
    });
    return message;
  };

  /**
   * Возвращает сообщения из чата.
   *
   * @param chatId ID чата.
   * @param extra Фильтры по времени, количеству и списку message ID.
   */
  getMessages = async (
    chatId: number,
    { message_ids, ...extra }: GetMessagesExtra = {},
  ) => {
    return this.raw.messages.get({
      chat_id: chatId,
      message_ids: message_ids?.join(','),
      ...extra,
    });
  };

  /**
   * Возвращает сообщение по ID.
   *
   * @param id ID сообщения (`mid`).
   */
  getMessage = async (id: string) => {
    return this.raw.messages.getById({ message_id: id });
  };

  /**
   * Возвращает подробную информацию о прикреплённом видео по токену видео-вложения.
   *
   * @param videoToken Токен видео-вложения.
   */
  getVideoAttachmentDetails = async (videoToken: string) => {
    return this.raw.messages.getVideoAttachmentDetails({
      video_token: videoToken,
    });
  };

  /**
   * Редактирует отправленное сообщение.
   *
   * @param messageId ID сообщения.
   * @param extra Новый текст, вложения, формат и настройки превью ссылок.
   * @remarks По схеме API редактирование доступно для сообщений младше 24 часов.
   */
  editMessage = async (messageId: string, extra?: EditMessageExtra) => {
    return this.raw.messages.edit({
      message_id: messageId,
      ...extra,
    });
  };

  /**
   * Удаляет отправленное сообщение.
   *
   * @param messageId ID сообщения.
   * @param extra Дополнительные параметры удаления.
   * @remarks По схеме API удаление доступно для сообщений младше 24 часов.
   */
  deleteMessage = async (messageId: string, extra?: DeleteMessageExtra) => {
    return this.raw.messages.delete({ message_id: messageId, ...extra });
  };

  /**
   * Отвечает на callback-кнопку.
   *
   * @param callbackId ID callback-запроса.
   * @param extra Сообщение для изменения текущего сообщения или одноразовое уведомление пользователю.
   */
  answerOnCallback = async (
    callbackId: string,
    extra?: AnswerOnCallbackExtra,
  ) => {
    return this.raw.messages.answerOnCallback({
      callback_id: callbackId,
      ...extra,
    });
  };

  /**
   * Возвращает информацию о текущем боте как участнике чата.
   *
   * @param chatId ID чата.
   */
  getChatMembership = (chatId: number) => {
    return this.raw.chats.getChatMembership({ chat_id: chatId });
  };

  /**
   * Возвращает список администраторов группового чата.
   *
   * @param chatId ID группового чата. Бот должен быть администратором в этом чате.
   */
  getChatAdmins = (chatId: number) => {
    return this.raw.chats.getChatAdmins({ chat_id: chatId });
  };

  /**
   * Назначает или обновляет администраторов группового чата.
   *
   * @param chatId ID группового чата. У групповых чатов ID может быть отрицательным.
   * @param admins Список пользователей и прав администратора. Боту нужно право `add_admins`.
   */
  setChatAdmins = (chatId: number, admins: ChatAdmin[]) => {
    return this.raw.chats.setChatAdmins({ chat_id: chatId, admins });
  };

  /**
   * Снимает права администратора у пользователя в групповом чате.
   *
   * @param chatId ID группового чата. У групповых чатов ID может быть отрицательным.
   * @param userId ID пользователя, у которого нужно отозвать права администратора.
   */
  deleteChatAdmin = (chatId: number, userId: number) => {
    return this.raw.chats.deleteChatAdmin({ chat_id: chatId, user_id: userId });
  };

  addChatMembers = (chatId: number, userIds: number[]) => {
    return this.raw.chats.addChatMembers({
      chat_id: chatId,
      user_ids: userIds,
    });
  };

  getChatMembers = (
    chatId: number,
    { user_ids, ...extra }: GetChatMembersExtra = {},
  ) => {
    return this.raw.chats.getChatMembers({
      chat_id: chatId,
      user_ids: user_ids?.join(','),
      ...extra,
    });
  };

  removeChatMember = (
    chatId: number,
    userId: number,
    extra?: RemoveChatMemberExtra,
  ) => {
    return this.raw.chats.removeChatMember({
      chat_id: chatId,
      user_id: userId,
      ...extra,
    });
  };

  getUpdates = async (
    types: MaybeArray<UpdateType> = [],
    extra: Omit<FlattenReq<GetUpdatesDTO>, 'types'> = {},
  ) => {
    return this.raw.subscriptions.getUpdates({
      types: Array.isArray(types) ? types.join(',') : types,
      ...extra,
    });
  };

  /** Возвращает список всех WebHook-подписок бота. */
  getSubscriptions = async () => {
    return this.raw.subscriptions.getSubscriptions();
  };

  /**
   * Настраивает доставку событий бота через WebHook.
   *
   * @param extra URL HTTPS-endpoint, список типов updates и необязательный секрет.
   */
  subscribe = async (extra: SubscribeExtra) => {
    return this.raw.subscriptions.subscribe(extra);
  };

  /**
   * Удаляет WebHook-подписку по URL.
   * После удаления становится доступно получение updates через long polling.
   */
  unsubscribe = async (url: string) => {
    return this.raw.subscriptions.unsubscribe({ url });
  };

  /**
   * Возвращает закреплённое сообщение чата.
   *
   * @param chatId ID чата.
   */
  getPinnedMessage = async (chatId: number) => {
    return this.raw.chats.getPinnedMessage({ chat_id: chatId });
  };

  /**
   * Закрепляет сообщение в чате.
   *
   * @param chatId ID чата.
   * @param messageId ID сообщения для закрепления.
   * @param extra Настройки уведомления участников.
   */
  pinMessage = async (
    chatId: number,
    messageId: string,
    extra?: PinMessageExtra,
  ) => {
    return this.raw.chats.pinMessage({
      chat_id: chatId,
      message_id: messageId,
      ...extra,
    });
  };

  /**
   * Снимает закреплённое сообщение в чате.
   *
   * @param chatId ID чата.
   */
  unpinMessage = async (chatId: number) => {
    return this.raw.chats.unpinMessage({ chat_id: chatId });
  };

  /**
   * Отправляет действие бота в чат, например `typing_on` или `sending_file`.
   *
   * @param chatId ID чата.
   * @param action Действие, которое увидят участники чата.
   */
  sendAction = async (chatId: number, action: SenderAction) => {
    return this.raw.chats.sendAction({
      chat_id: chatId,
      action,
    });
  };

  /**
   * Удаляет бота из группового чата.
   *
   * @param chatId ID чата.
   */
  leaveChat = async (chatId: number) => {
    return this.raw.chats.leaveChat({ chat_id: chatId });
  };

  /**
   * Загружает изображение и возвращает attachment builder для отправки сообщения.
   *
   * @param options URL изображения или локальный source, timeout, signal и обработчик прогресса.
   */
  uploadImage = async (options: UploadImageOptions) => {
    const data = await this.upload.image(options);
    return new ImageAttachment(data);
  };

  /**
   * Загружает видео и возвращает attachment builder для отправки сообщения.
   *
   * @param options Локальный source, timeout, signal и обработчик прогресса.
   */
  uploadVideo = async (options: UploadVideoOptions) => {
    const data = await this.upload.video(options);
    return new VideoAttachment(data);
  };

  /**
   * Загружает аудио и возвращает attachment builder для отправки сообщения.
   *
   * @param options Локальный source, timeout, signal и обработчик прогресса.
   */
  uploadAudio = async (options: UploadAudioOptions) => {
    const data = await this.upload.audio(options);
    return new AudioAttachment(data);
  };

  /**
   * Загружает файл и возвращает attachment builder для отправки сообщения.
   *
   * @param options Локальный source, timeout, signal и обработчик прогресса.
   */
  uploadFile = async (options: UploadFileOptions) => {
    const data = await this.upload.file(options);
    return new FileAttachment(data);
  };
}
