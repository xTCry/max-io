import * as crypto from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:https';
import { resolve } from 'node:path';
import * as tls from 'node:tls';
import { inflateRawSync } from 'node:zlib';

/** Официальные ZIP-архивы сертификатов Минцифры. */
export type RussianCaSources = {
  root: string;
  subordinate: string;
};

/** Параметры установки локального CA-бандла. */
export type RussianCaInstallOptions = {
  /** Каталог для PEM-бандла. По умолчанию `<cwd>/.max-io/certs`. */
  directory?: string;
  /** Таймаут TLS-проверки и скачивания архивов в миллисекундах. */
  timeoutMs?: number;
  /** Максимальный размер каждого ZIP-архива в байтах. */
  maxArchiveBytes?: number;
  /** Скачать архивы заново, даже если локальный bundle уже валиден. */
  force?: boolean;
  /** URL ZIP-архивов. Нужны только для контролируемых окружений. */
  sources?: Partial<RussianCaSources>;
};

/** Параметры проверки TLS и создания локального CA. */
export type RussianCaConnectionOptions = RussianCaInstallOptions & {
  /** Хосты, для которых нужно проверить доверие Node.js. */
  hosts?: string[];
};

/** Результат подготовки локального CA-бандла. */
export type RussianCaInstallResult = {
  bundlePath: string;
  metadataPath: string;
  certificates: string[];
  downloaded: boolean;
};

type CertificateRecord = {
  pem: string;
  fingerprint: string;
  certificate?: crypto.X509Certificate;
  /** `X509Certificate` может прочитать ГОСТ CA, но не извлечь public key. */
  canVerifySignature: boolean;
};

type TlsModule = typeof tls & {
  getCACertificates?: (
    type?: 'default' | 'system' | 'bundled' | 'extra',
  ) => string[];
};

const PEM_PATTERN =
  /-----BEGIN (?:TRUSTED |X509 )?CERTIFICATE-----[\s\S]+?-----END (?:TRUSTED |X509 )?CERTIFICATE-----/g;

const CERTIFICATE_ERROR_CODES = new Set([
  'CERT_UNTRUSTED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ARCHIVE_BYTES = 5 * 1024 * 1024;
const MAX_CERTIFICATE_ENTRY_BYTES = 1024 * 1024;

const INSTALL_PROMISES = new Map<string, Promise<RussianCaInstallResult>>();
const TRUST_PROMISES = new Map<string, Promise<boolean>>();

export const DEFAULT_RUSSIAN_CA_HOSTS = ['platform-api2.max.ru'];

export const DEFAULT_RUSSIAN_CA_SOURCES: RussianCaSources = {
  root: 'https://gu-st.ru/content/lending/linux_russian_trusted_root_ca_pem.zip',
  subordinate:
    'https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.zip',
};

/** SHA-256 официальных архивов, из которых был сформирован текущий bundle. */
export const DEFAULT_RUSSIAN_CA_ARCHIVE_SHA256 = {
  root: 'ca99ca9b0022ec8b99d5822502cf3f38d4797bdd02cc098996778421d72d7e24',
  subordinate:
    '35d8ce3ed079b1cd3a1650bf2ed2d873eee288799924dbbe128c172b65d3594e',
} as const;

const normalizePem = (value: string): string => {
  const body = value
    .replace(/-----BEGIN (?:TRUSTED |X509 )?CERTIFICATE-----/, '')
    .replace(/-----END (?:TRUSTED |X509 )?CERTIFICATE-----/, '')
    .replace(/\s+/g, '');

  if (!body) {
    throw new Error('Certificate PEM body is empty');
  }

  return [
    '-----BEGIN CERTIFICATE-----',
    body.match(/.{1,64}/g)?.join('\n') ?? body,
    '-----END CERTIFICATE-----',
  ].join('\n');
};

const derToPem = (value: Buffer): string => {
  const body = value.toString('base64');

  if (!body) {
    throw new Error('Certificate DER body is empty');
  }

  return [
    '-----BEGIN CERTIFICATE-----',
    body.match(/.{1,64}/g)?.join('\n') ?? body,
    '-----END CERTIFICATE-----',
  ].join('\n');
};

const splitCertificates = (value: Buffer): string[] => {
  const blocks = value.toString('utf8').match(PEM_PATTERN);

  if (blocks?.length) {
    return blocks.map(normalizePem);
  }

  return [derToPem(value)];
};

const getFingerprint = (pem: string): string => {
  return crypto.createHash('sha256').update(pem).digest('hex');
};

const getArchiveFingerprint = (archive: Buffer): string => {
  return crypto.createHash('sha256').update(archive).digest('hex');
};

const parseCertificate = (pem: string): CertificateRecord => {
  // Проверка, что OpenSSL текущего Node.js способен использовать сертификат.
  tls.createSecureContext({ ca: pem });

  const Certificate = crypto.X509Certificate;

  // Node.js до 15.6 не предоставляет X509Certificate. TLS всё ещё проверяет
  // формат PEM, но расширенная проверка срока и цепочки в этой среде недоступна.
  if (!Certificate) {
    return {
      pem,
      fingerprint: getFingerprint(pem),
      canVerifySignature: false,
    };
  }

  let certificate: crypto.X509Certificate;

  try {
    certificate = new Certificate(pem);
  } catch {
    // Некоторые ГОСТ-сертификаты принимает TLS текущего Node.js, но не умеет
    // разобрать X509Certificate. Оставляем их в bundle после TLS-проверки PEM.
    return {
      pem,
      fingerprint: getFingerprint(pem),
      canVerifySignature: false,
    };
  }
  const validFrom = Date.parse(certificate.validFrom);
  const validTo = Date.parse(certificate.validTo);
  const now = Date.now();

  if (!certificate.ca) {
    throw new Error('Downloaded certificate is not a CA certificate');
  }

  if (!Number.isFinite(validFrom) || !Number.isFinite(validTo)) {
    throw new Error('Downloaded certificate has invalid validity dates');
  }

  if (now < validFrom || now > validTo) {
    throw new Error('Downloaded certificate is expired or not active yet');
  }

  let canVerifySignature = true;

  try {
    const publicKey = certificate.publicKey;
    void publicKey;
  } catch {
    // В OpenSSL без ГОСТ provider нельзя извлечь public key, хотя TLS умеет
    // принять сертификат как CA. Не используем X509 verify для такого CA.
    canVerifySignature = false;
  }

  return {
    pem: normalizePem(certificate.toString()),
    fingerprint: certificate.fingerprint256.replace(/:/g, '').toLowerCase(),
    certificate,
    canVerifySignature,
  };
};

const uniqueCertificates = (
  certificates: CertificateRecord[],
): CertificateRecord[] => {
  const result = new Map<string, CertificateRecord>();

  for (const certificate of certificates) {
    result.set(certificate.fingerprint, certificate);
  }

  return [...result.values()];
};

/**
 * Проверяет подпись, если OpenSSL runtime поддерживает алгоритм сертификата.
 * Некоторые Node.js принимают ГОСТ CA в TLS, но не умеют проверить его через
 * `X509Certificate.verify()`.
 */
const verifyCertificateSignature = (
  certificate: CertificateRecord,
  issuer: CertificateRecord,
): boolean | undefined => {
  if (
    !certificate.certificate ||
    !issuer.certificate ||
    !certificate.canVerifySignature ||
    !issuer.canVerifySignature
  ) {
    return undefined;
  }

  try {
    return certificate.certificate.verify(issuer.certificate.publicKey);
  } catch {
    return undefined;
  }
};

const validateChain = (
  roots: CertificateRecord[],
  subordinates: CertificateRecord[],
): CertificateRecord[] => {
  if (!roots.length) {
    throw new Error('Russian Trusted Root CA was not found');
  }

  if (!subordinates.length) {
    throw new Error('Russian Trusted Sub CA was not found');
  }

  const x509Roots = roots.filter((item) => item.certificate);
  const x509Subordinates = subordinates.filter((item) => item.certificate);

  if (x509Roots.length > 0) {
    const validRoots = x509Roots.filter((certificate) => {
      return verifyCertificateSignature(certificate, certificate) === true;
    });

    // Если runtime умеет проверить хотя бы один сертификат, проверяем доступную
    // часть цепочки. Для неподдерживаемых ГОСТ-алгоритмов уже есть TLS-проверка
    // формата и фиксированный SHA-256 официального ZIP-архива.
    if (validRoots.length === 0 && x509Roots.length === roots.length) {
      throw new Error('Russian Trusted Root CA signature is invalid');
    }

    for (const subordinate of x509Subordinates) {
      const issuerRoots = x509Roots.filter((root) => {
        return root.certificate!.subject === subordinate.certificate!.issuer;
      });
      const results = issuerRoots.map((root) => {
        return verifyCertificateSignature(subordinate, root);
      });

      if (results.includes(false) && !results.includes(true)) {
        throw new Error('Russian Trusted Sub CA signature is invalid');
      }
    }
  }

  return uniqueCertificates([...roots, ...subordinates]);
};

const findEndOfCentralDirectory = (archive: Buffer): number => {
  const minimumOffset = Math.max(0, archive.length - 65_557);

  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error('ZIP end of central directory was not found');
};

/**
 * Извлекает только сертификаты из обычного ZIP без ZIP64 и шифрования.
 *
 * Архивы маленькие, а ограничения защищают от ZIP bomb до распаковки.
 */
const extractCertificateEntries = (archive: Buffer): Buffer[] => {
  if (archive.length < 22) {
    throw new Error('ZIP archive is too small');
  }

  const endOffset = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralDirectorySize = archive.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);

  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new Error('ZIP64 archives are not supported');
  }

  if (centralDirectoryOffset + centralDirectorySize > archive.length) {
    throw new Error('ZIP central directory is outside the archive');
  }

  const entries: Buffer[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > archive.length ||
      archive.readUInt32LE(offset) !== 0x02014b50
    ) {
      throw new Error('Invalid ZIP central directory entry');
    }

    const flags = archive.readUInt16LE(offset + 8);
    const compression = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    if (nameEnd > archive.length) {
      throw new Error('ZIP entry name is outside the archive');
    }

    const name = archive.subarray(nameStart, nameEnd).toString('utf8');

    offset = nameEnd + extraLength + commentLength;

    if (!/\.(?:crt|cer|pem)$/i.test(name)) {
      continue;
    }

    if (flags & 0x1) {
      throw new Error('Encrypted ZIP entries are not supported');
    }

    if (uncompressedSize > MAX_CERTIFICATE_ENTRY_BYTES) {
      throw new Error('Certificate ZIP entry is too large');
    }

    if (
      localHeaderOffset + 30 > archive.length ||
      archive.readUInt32LE(localHeaderOffset) !== 0x04034b50
    ) {
      throw new Error('Invalid ZIP local file header');
    }

    const localNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + compressedSize;

    if (dataEnd > archive.length) {
      throw new Error('ZIP entry data is outside the archive');
    }

    const compressed = archive.subarray(dataOffset, dataEnd);
    let extracted: Buffer;

    if (compression === 0) {
      extracted = Buffer.from(compressed);
    } else if (compression === 8) {
      extracted = inflateRawSync(compressed, {
        maxOutputLength: MAX_CERTIFICATE_ENTRY_BYTES,
      });
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compression}`);
    }

    if (uncompressedSize !== 0 && extracted.length !== uncompressedSize) {
      throw new Error('ZIP entry size does not match metadata');
    }

    entries.push(extracted);
  }

  if (!entries.length) {
    throw new Error('Certificate files were not found in ZIP archive');
  }

  return entries;
};

const downloadArchive = (
  source: string,
  timeoutMs: number,
  maxBytes: number,
  redirectCount = 0,
): Promise<Buffer> => {
  return new Promise((resolvePromise, rejectPromise) => {
    if (redirectCount > 5) {
      rejectPromise(new Error('Too many certificate redirects'));
      return;
    }

    const url = new URL(source);

    if (url.protocol !== 'https:') {
      rejectPromise(new Error('Certificate source must use HTTPS'));
      return;
    }

    const requestInstance = request(
      url,
      {
        method: 'GET',
        headers: {
          accept: 'application/zip, application/octet-stream',
          'user-agent': 'max-io-ca',
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();

          const nextUrl = new URL(location, url);
          downloadArchive(
            nextUrl.toString(),
            timeoutMs,
            maxBytes,
            redirectCount + 1,
          ).then(resolvePromise, rejectPromise);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          rejectPromise(
            new Error(`Certificate download failed with status ${statusCode}`),
          );
          return;
        }

        const contentLength = Number(response.headers['content-length'] ?? 0);

        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
          response.resume();
          rejectPromise(new Error('Certificate archive is too large'));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        let completed = false;

        const rejectOnce = (error: Error): void => {
          if (completed) return;
          completed = true;
          response.destroy();
          rejectPromise(error);
        };

        response.on('data', (chunk) => {
          const value = Buffer.from(chunk);
          size += value.length;

          if (size > maxBytes) {
            rejectOnce(new Error('Certificate archive is too large'));
            return;
          }

          chunks.push(value);
        });

        response.once('end', () => {
          if (completed) return;
          completed = true;
          resolvePromise(Buffer.concat(chunks));
        });

        response.once('error', rejectOnce);
      },
    );

    requestInstance.setTimeout(timeoutMs, () => {
      requestInstance.destroy(new Error('Certificate download timeout'));
    });
    requestInstance.once('error', rejectPromise);
    requestInstance.end();
  });
};

const writeAtomic = async (targetPath: string, content: string): Promise<void> => {
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await writeFile(temporaryPath, content, {
      encoding: 'utf8',
      mode: 0o644,
    });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

const readBundle = async (bundlePath: string): Promise<string[]> => {
  const content = await readFile(bundlePath, 'utf8');
  const blocks = content.match(PEM_PATTERN);

  if (!blocks?.length) {
    throw new Error('Local Russian CA bundle is empty');
  }

  const certificates = uniqueCertificates(
    blocks.map(normalizePem).map(parseCertificate),
  );

  if (certificates.length < 2) {
    throw new Error('Local Russian CA bundle is incomplete');
  }

  return certificates.map((certificate) => certificate.pem);
};

const getDirectory = (directory?: string): string => {
  return resolve(
    directory ??
      process.env.MAX_IO_CA_DIR ??
      resolve(process.cwd(), '.max-io', 'certs'),
  );
};

const installRussianTrustedCa = async (
  options: RussianCaInstallOptions,
): Promise<RussianCaInstallResult> => {
  const directory = getDirectory(options.directory);
  const bundlePath = resolve(directory, 'russian-trusted-ca.pem');
  const metadataPath = resolve(directory, 'russian-trusted-ca.json');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxArchiveBytes = options.maxArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES;
  const sources: RussianCaSources = {
    ...DEFAULT_RUSSIAN_CA_SOURCES,
    ...options.sources,
  };

  await mkdir(directory, { recursive: true });

  if (!options.force) {
    try {
      return {
        bundlePath,
        metadataPath,
        certificates: await readBundle(bundlePath),
        downloaded: false,
      };
    } catch {
      // Неиспользуемый или повреждённый bundle безопасно пересоздаётся.
    }
  }

  const [rootArchive, subordinateArchive] = await Promise.all([
    downloadArchive(sources.root, timeoutMs, maxArchiveBytes),
    downloadArchive(sources.subordinate, timeoutMs, maxArchiveBytes),
  ]);

  if (
    sources.root === DEFAULT_RUSSIAN_CA_SOURCES.root &&
    getArchiveFingerprint(rootArchive) !== DEFAULT_RUSSIAN_CA_ARCHIVE_SHA256.root
  ) {
    throw new Error('Russian Trusted Root CA archive checksum does not match');
  }

  if (
    sources.subordinate === DEFAULT_RUSSIAN_CA_SOURCES.subordinate &&
    getArchiveFingerprint(subordinateArchive) !==
      DEFAULT_RUSSIAN_CA_ARCHIVE_SHA256.subordinate
  ) {
    throw new Error('Russian Trusted Sub CA archive checksum does not match');
  }

  const roots = extractCertificateEntries(rootArchive)
    .flatMap(splitCertificates)
    .map(parseCertificate);
  const subordinates = extractCertificateEntries(subordinateArchive)
    .flatMap(splitCertificates)
    .map(parseCertificate);
  const certificates = validateChain(roots, subordinates);
  const bundle = `${certificates
    .map((certificate) => certificate.pem.trim())
    .join('\n')}\n`;
  const metadata = `${JSON.stringify(
    {
      downloadedAt: new Date().toISOString(),
      sources,
      fingerprints: certificates.map((certificate) => certificate.fingerprint),
    },
    null,
    2,
  )}\n`;

  await writeAtomic(bundlePath, bundle);
  await writeAtomic(metadataPath, metadata);

  return {
    bundlePath,
    metadataPath,
    certificates: certificates.map((certificate) => certificate.pem),
    downloaded: true,
  };
};

/** Устанавливает или переиспользует локальный bundle сертификатов Минцифры. */
export const ensureRussianTrustedCa = (
  options: RussianCaInstallOptions = {},
): Promise<RussianCaInstallResult> => {
  const directory = getDirectory(options.directory);
  const key = JSON.stringify({
    directory,
    force: options.force ?? false,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxArchiveBytes: options.maxArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES,
    sources: {
      ...DEFAULT_RUSSIAN_CA_SOURCES,
      ...options.sources,
    },
  });
  const existing = INSTALL_PROMISES.get(key);

  if (existing) return existing;

  const promise = installRussianTrustedCa(options).finally(() => {
    INSTALL_PROMISES.delete(key);
  });

  INSTALL_PROMISES.set(key, promise);

  return promise;
};

/** Определяет ошибку недоверенного TLS-сертификата, включая `fetch` cause. */
export const isRussianCaCertificateError = (error: unknown): boolean => {
  let current = error;

  while (current && typeof current === 'object') {
    const value = current as {
      code?: string;
      message?: string;
      cause?: unknown;
    };

    if (value.code && CERTIFICATE_ERROR_CODES.has(value.code)) {
      return true;
    }

    if (
      value.message &&
      /unable to get local issuer|unable to verify the first certificate|self[- ]signed certificate|certificate is not trusted/i.test(
        value.message,
      )
    ) {
      return true;
    }

    current = value.cause;
  }

  return false;
};

const checkHostTrust = (host: string, timeoutMs: number): Promise<boolean> => {
  return new Promise((resolvePromise, rejectPromise) => {
    let completed = false;
    const socket = tls.connect({
      host,
      port: 443,
      servername: host,
      rejectUnauthorized: true,
    });

    const complete = (result: boolean | Error): void => {
      if (completed) return;
      completed = true;
      socket.destroy();

      if (result instanceof Error) {
        rejectPromise(result);
        return;
      }

      resolvePromise(result);
    };

    socket.setTimeout(timeoutMs, () => {
      const error = new Error(`TLS connection timeout for ${host}`) as NodeJS.ErrnoException;
      error.code = 'ETIMEDOUT';
      complete(error);
    });
    socket.once('secureConnect', () => complete(true));
    socket.once('error', (error) => {
      complete(isRussianCaCertificateError(error) ? false : error);
    });
  });
};

/** Проверяет, доверяет ли текущий Node.js сертификату конкретного хоста. */
export const isHostTrustedByNode = (
  host: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<boolean> => {
  const normalizedHost = host.trim().toLowerCase();

  if (!normalizedHost) {
    return Promise.reject(new Error('TLS host must not be empty'));
  }

  const key = `${normalizedHost}:${timeoutMs}`;
  const existing = TRUST_PROMISES.get(key);

  if (existing) return existing;

  const promise = checkHostTrust(normalizedHost, timeoutMs).catch((error) => {
    TRUST_PROMISES.delete(key);
    throw error;
  });

  TRUST_PROMISES.set(key, promise);

  return promise;
};

const uniquePem = (certificates: string[]): string[] => {
  const result = new Map<string, string>();

  for (const certificate of certificates) {
    const pem = normalizePem(certificate);
    result.set(getFingerprint(pem), pem);
  }

  return [...result.values()];
};

/** Возвращает CA текущего Node.js без изменения глобального TLS-состояния. */
export const getDefaultNodeCaCertificates = async (): Promise<string[]> => {
  const getCACertificates = (tls as TlsModule).getCACertificates;

  if (typeof getCACertificates === 'function') {
    return uniquePem(getCACertificates.call(tls, 'default'));
  }

  const certificates = [...tls.rootCertificates];
  const extraCaPath = process.env.NODE_EXTRA_CA_CERTS;

  if (extraCaPath) {
    try {
      const extra = await readFile(extraCaPath, 'utf8');
      const blocks = extra.match(PEM_PATTERN);

      if (blocks?.length) {
        certificates.push(...blocks);
      }
    } catch {
      // Некорректный NODE_EXTRA_CA_CERTS не должен скрывать системные CA.
    }
  }

  return uniquePem(certificates);
};

/**
 * Возвращает CA для локального dispatcher или `undefined`, если текущий Node.js
 * уже доверяет сертификату указанного MAX-хоста.
 */
export const resolveRussianCaList = async (
  options: RussianCaConnectionOptions = {},
): Promise<string[] | undefined> => {
  const hosts = [
    ...new Set(
      (options.hosts ?? DEFAULT_RUSSIAN_CA_HOSTS)
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (!hosts.length) {
    throw new Error('At least one TLS host is required');
  }

  const trust = await Promise.all(
    hosts.map((host) => isHostTrustedByNode(host, options.timeoutMs)),
  );

  if (trust.every(Boolean)) {
    return undefined;
  }

  const [defaults, local] = await Promise.all([
    getDefaultNodeCaCertificates(),
    ensureRussianTrustedCa(options),
  ]);

  return uniquePem([...defaults, ...local.certificates]);
};
