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
import { RawApi, SenderAction } from './network/api';
import type {
  AnswerOnCallbackExtra,
  BotCommand,
  Client,
  DeleteCommentResponse,
  DeleteMessageExtra,
  EditCommentExtra,
  EditMessageExtra,
  EditMyInfoDTO,
  FlattenReq,
  GetCommentsExtra,
  GetMessagesExtra,
  GetUpdatesExtra,
  SendCommentExtra,
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
    this.upload = new Upload(this, client.uploadFetch);
  }

  getMyInfo = async () => {
    return this.raw.bots.getMyInfo();
  };

  editMyInfo = async (extra: FlattenReq<EditMyInfoDTO>) => {
    return this.raw.bots.editMyInfo(extra);
  };

  /**
   * Изменяет список команд текущего бота.
   *
   * @remarks Endpoint подтверждён схемой Bot API 0.0.33 от 18 августа 2026 года.
   * Передайте пустой массив, чтобы удалить все команды.
   */
  editMyCommands = async (commands: BotCommand[]) => {
    return this.raw.bots.editMyCommands({ commands });
  };

  setMyCommands = async (commands: BotCommand[]) => {
    return this.editMyCommands(commands);
  };

  deleteMyCommands = async () => {
    return this.editMyCommands([]);
  };

  getAllChats = async (extra: GetAllChatsExtra = {}) => {
    return this.raw.chats.getAll(extra);
  };

  getChat = async (id: number) => {
    return this.raw.chats.getById({ chat_id: id });
  };

  /**
   * Возвращает информацию о канале по публичной ссылке.
   *
   * @deprecated Endpoint отсутствует в схеме Bot API 0.0.33 от 18 августа 2026 года.
   * Ручная проверка `GET /chats/max_news` на основном endpoint 23 июля 2026 года вернула `404 chat.not.found`.
   * Оставлен для обратной совместимости.
   * @remarks Ранее метод был доступен только для каналов; обычные чаты по публичной ссылке не поддерживались.
   */
  getChatByLink = async (link: string) => {
    return this.raw.chats.getByLink({ chat_link: link });
  };

  /**
   * Изменяет информацию группового чата или канала.
   *
   * @param chatId ID группового чата. У групповых чатов ID может быть отрицательным.
   * @param extra Новые поля чата: название, описание, иконка, закреплённое сообщение и настройки уведомлений.
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
   * Возвращает комментарии к посту в канале.
   *
   * @param messageId ID поста в канале (`mid`).
   * @param extra Фильтры по времени, количеству или списку ID комментариев.
   * @remarks Для чтения бот должен быть администратором канала с правом `read_all_messages`.
   */
  getComments = async (
    messageId: string,
    { comment_ids, ...extra }: GetCommentsExtra = {},
  ) => {
    return this.raw.comments.get({
      message_id: messageId,
      comment_ids: comment_ids?.join(','),
      ...extra,
    });
  };

  /**
   * Возвращает комментарий к посту по его ID.
   *
   * @remarks Для чтения бот должен быть администратором канала с правом `read_all_messages`.
   */
  getComment = async (messageId: string, commentId: string) => {
    return this.raw.comments.getById({
      message_id: messageId,
      comment_id: commentId,
    });
  };

  /**
   * Отправляет комментарий к посту в канале.
   *
   * @param messageId ID поста в канале (`mid`).
   * @param text Текст комментария. Ограничение API: до `4000` символов.
   * @param extra Ответ на другой комментарий, формат текста, настройка предпросмотра и `AbortSignal`.
   * @remarks В настройках канала должны быть включены комментарии; боту нужны права `read_all_messages` и `write`.
   */
  sendComment = async (
    messageId: string,
    text: string,
    extra?: SendCommentExtra,
  ) => {
    const { message } = await this.raw.comments.send({
      message_id: messageId,
      text,
      ...extra,
    });
    return message;
  };

  /**
   * Редактирует комментарий бота к посту в канале.
   *
   * @remarks Бот может изменить свой комментарий, а комментарии от имени канала — только с правом `edit`.
   */
  editComment = async (
    messageId: string,
    commentId: string,
    extra?: EditCommentExtra,
  ) => {
    return this.raw.comments.edit({
      message_id: messageId,
      comment_id: commentId,
      ...extra,
    });
  };

  /**
   * Удаляет комментарий к посту в канале.
   *
   * @remarks Боту нужны права администратора `read_all_messages` и `delete`.
   */
  deleteComment = async (
    messageId: string,
    commentId: string,
  ): Promise<DeleteCommentResponse> => {
    return this.raw.comments.delete({
      message_id: messageId,
      comment_id: commentId,
    });
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
   * @remarks По схеме Bot API 0.0.33 сообщения в диалогах можно редактировать до 7 суток,
   * а сообщения с inline-кнопками, в групповых чатах и каналах — без ограничения срока.
   * Не отправляйте более двух запросов редактирования в секунду для одного диалога, чата или канала.
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
   * @remarks По схеме Bot API 0.0.33 бот должен быть администратором с правом удаления:
   * в канале и групповом чате можно удалить любое сообщение, в диалоге — только отправленное ботом.
   * Не отправляйте более двух запросов удаления в секунду для одного диалога, чата или канала.
   */
  deleteMessage = async (messageId: string, extra?: DeleteMessageExtra) => {
    return this.raw.messages.delete({ message_id: messageId, ...extra });
  };

  /**
   * Отвечает на callback-кнопку.
   *
   * @param callbackId ID callback-запроса.
   * @param extra Новое содержимое текущего сообщения, настройка предпросмотра ссылок или однократное уведомление пользователю.
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

  /**
   * Добавляет пользователей в групповой чат.
   *
   * @remarks По актуальной схеме метод не добавляет подписчиков в каналы.
   */
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
    extra: GetUpdatesExtra = {},
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
