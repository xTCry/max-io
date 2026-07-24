#!/usr/bin/env node

import { resolve } from 'node:path';

import { ensureRussianTrustedCa } from '../tls/russian-ca';

type CliOptions = {
  directory?: string;
  force: boolean;
};

const printHelp = (): void => {
  console.log(`Использование:
  max-io-install-russian-ca [--force] [--dir <путь>]

Создаёт локальный CA-bundle сертификатов Минцифры для platform-api2.max.ru.
По умолчанию файлы сохраняются в .max-io/certs текущего проекта.`);
};

const parseOptions = (argumentsList: string[]): CliOptions => {
  const options: CliOptions = { force: false };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--force') {
      options.force = true;
      continue;
    }

    if (argument === '--dir') {
      const directory = argumentsList[index + 1];

      if (!directory) {
        throw new Error('Expected a value after --dir');
      }

      options.directory = resolve(directory);
      index += 1;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
};

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  const result = await ensureRussianTrustedCa(options);

  console.log(
    `${result.downloaded ? 'Downloaded' : 'Reused'} ${result.certificates.length} CA certificates.`,
  );
  console.log(`Bundle: ${result.bundlePath}`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Failed to install Russian CA bundle: ${message}`);
  process.exitCode = 1;
});
