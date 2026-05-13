import { readFileSync, writeFileSync } from 'fs';

type PackageJson = {
  exports?: Record<string, unknown>;
  files?: string[];
};

const packageJson = JSON.parse(
  readFileSync('package.json', 'utf8'),
) as PackageJson;
const files = new Set(packageJson.files ?? []);

packageJson.exports ??= {};

writeFileSync('types.js', "module.exports = require('./lib/types');\n");
writeFileSync('types.d.ts', "export * from './lib/types';\n");

packageJson.exports['./types'] = {
  types: './types.d.ts',
  require: './types.js',
  default: './types.js',
};

files.add('types.*');
packageJson.files = Array.from(files);

writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
