/**
 * Тип загружаемого файла.
 *
 * Поддерживаемые форматы:
 * - `image`: JPG, JPEG, PNG, GIF, TIFF, BMP, HEIC.
 * - `video`: MP4, MOV, MKV, WEBM, MATROSKA.
 * - `audio`: MP3, WAV, M4A и другие.
 * - `file`: любые типы файлов.
 *
 * Значение `photo` больше не поддерживается; используйте `image`.
 */
export type UploadType = 'image' | 'video' | 'audio' | 'file';
