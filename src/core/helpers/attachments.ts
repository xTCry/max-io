import {
  AudioAttachmentRequest,
  FileAttachmentRequest,
  ImageAttachmentRequest,
  LocationAttachmentRequest,
  ShareAttachmentRequest,
  StickerAttachmentRequest,
  VideoAttachmentRequest,
} from '../network/api';

class Attachment {
  toJson() {
    throw new Error('Attachment not implemented.');
  }
}

/** Базовый wrapper для медиа-вложений, которые отправляются по upload token. */
export class MediaAttachment extends Attachment {
  /** Токен загруженного медиафайла. */
  readonly token?: string;

  constructor({ token }: { token?: string }) {
    super();
    this.token = token;
  }

  get payload(): object {
    return { token: this.token };
  }
}

/** Видео-вложение для отправки в сообщении. */
export class VideoAttachment extends MediaAttachment {
  readonly type = 'video';

  toJson(): VideoAttachmentRequest {
    return {
      type: this.type,
      payload: this.payload,
    };
  }
}

/** Набор токенов изображений, который возвращает upload endpoint для `image`. */
export type ImagePhotos = {
  [key: string]: { token: string };
};

/** Изображение для отправки в сообщении: по token, URL или `photos` из upload API. */
export class ImageAttachment extends MediaAttachment {
  /** Набор токенов изображений, полученный после upload. */
  readonly photos?: ImagePhotos;

  /** URL изображения, которое нужно прикрепить без upload API. */
  readonly url?: string;

  constructor(
    options: { token?: string } | { photos?: ImagePhotos } | { url?: string },
  ) {
    super({ token: 'token' in options ? options.token : undefined });
    if ('photos' in options) {
      this.photos = options.photos;
    }
    if ('url' in options) {
      this.url = options.url;
    }
  }

  get payload(): ImageAttachmentRequest['payload'] {
    if (this.token) {
      return { token: this.token };
    }
    if (this.url) {
      return { url: this.url };
    }
    return { photos: this.photos };
  }

  toJson(): ImageAttachmentRequest {
    return {
      type: 'image',
      payload: this.payload,
    };
  }
}

/** Аудио-вложение для отправки в сообщении. */
export class AudioAttachment extends MediaAttachment {
  toJson(): AudioAttachmentRequest {
    return {
      type: 'audio',
      payload: this.payload,
    };
  }
}

/** Файл для отправки в сообщении. */
export class FileAttachment extends MediaAttachment {
  toJson(): FileAttachmentRequest {
    return {
      type: 'file',
      payload: this.payload,
    };
  }
}

/** Стикер для отправки в сообщении по коду стикера. */
export class StickerAttachment extends Attachment {
  /** Код стикера. */
  readonly code: string;

  constructor({ code }: { code: string }) {
    super();
    this.code = code;
  }

  get payload(): StickerAttachmentRequest['payload'] {
    return { code: this.code };
  }

  toJson(): StickerAttachmentRequest {
    return {
      type: 'sticker',
      payload: this.payload,
    };
  }
}

/** Геолокация для отправки в сообщении. */
export class LocationAttachment extends Attachment {
  /** Долгота. */
  readonly longitude: number;

  /** Широта. */
  readonly latitude: number;

  constructor({ lon, lat }: { lon: number; lat: number }) {
    super();
    this.longitude = lon;
    this.latitude = lat;
  }

  toJson(): LocationAttachmentRequest {
    return {
      type: 'location',
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}

/** Вложение предпросмотра ссылки. */
export class ShareAttachment extends Attachment {
  /** URL для предпросмотра ссылки. */
  readonly url?: string;

  /** Token загруженного изображения для предпросмотра. */
  readonly token?: string;

  constructor({ url, token }: { url?: string; token?: string } = {}) {
    super();
    this.url = url;
    this.token = token;
  }

  get payload() {
    return {
      url: this.url,
      token: this.token,
    };
  }

  toJson(): ShareAttachmentRequest {
    return {
      type: 'share',
      payload: this.payload,
    };
  }
}
