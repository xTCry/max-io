import { describe, expect, it } from 'vitest';

import {
  AudioAttachment,
  FileAttachment,
  ImageAttachment,
  LocationAttachment,
  ShareAttachment,
  StickerAttachment,
  VideoAttachment,
} from './attachments';

describe('attachment helpers', () => {
  it('сериализует медиа-вложения с upload token', () => {
    expect(new VideoAttachment({ token: 'video-token' }).toJson()).toEqual({
      type: 'video',
      payload: { token: 'video-token' },
    });
    expect(new AudioAttachment({ token: 'audio-token' }).toJson()).toEqual({
      type: 'audio',
      payload: { token: 'audio-token' },
    });
    expect(new FileAttachment({ token: 'file-token' }).toJson()).toEqual({
      type: 'file',
      payload: { token: 'file-token' },
    });
  });

  it('сериализует image из token, URL или набора photos', () => {
    expect(new ImageAttachment({ token: 'image-token' }).toJson()).toEqual({
      type: 'image',
      payload: { token: 'image-token' },
    });
    expect(
      new ImageAttachment({
        url: 'https://cdn.example.test/image.png',
      }).toJson(),
    ).toEqual({
      type: 'image',
      payload: { url: 'https://cdn.example.test/image.png' },
    });
    expect(
      new ImageAttachment({
        photos: { large: { token: 'large-token' } },
      }).toJson(),
    ).toEqual({
      type: 'image',
      payload: { photos: { large: { token: 'large-token' } } },
    });
  });

  it('сериализует sticker, location и share вложения', () => {
    expect(new StickerAttachment({ code: 'sticker-code' }).toJson()).toEqual({
      type: 'sticker',
      payload: { code: 'sticker-code' },
    });
    expect(
      new LocationAttachment({ lon: 37.6173, lat: 55.7558 }).toJson(),
    ).toEqual({
      type: 'location',
      longitude: 37.6173,
      latitude: 55.7558,
    });
    expect(
      new ShareAttachment({
        url: 'https://max.ru',
        token: 'image-token',
      }).toJson(),
    ).toEqual({
      type: 'share',
      payload: { url: 'https://max.ru', token: 'image-token' },
    });
  });
});
