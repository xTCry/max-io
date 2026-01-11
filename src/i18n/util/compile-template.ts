import * as vm from 'vm';

import { RepositoryData, RepositoryEntry, Template } from '../types';

function escapeTemplate(template: string) {
  return `\`${template.replace(/`/gm, '\\`')}\``;
}

export function compile(
  template: string,
  defaultContext?: vm.Context,
  ops?: vm.RunningScriptInNewContextOptions,
) {
  if (typeof template !== 'string') {
    throw new Error('Template must be a string');
  }

  const options: vm.RunningScriptInNewContextOptions = { timeout: 500, ...ops };
  const code = escapeTemplate(template);
  const script = new vm.Script(code);
  return (context?: vm.Context) => {
    try {
      return script.runInNewContext({ ...defaultContext, ...context }, options);
    } catch (err) {
      throw new Error('Failed to compile template', { cause: err });
    }
  };
}

export function compileTemplates(
  root: Readonly<Record<string, string>>,
): RepositoryEntry<RepositoryData> {
  const result: RepositoryEntry<RepositoryData> = {};

  for (const [key, value] of Object.entries(root)) {
    if (value.includes('${')) {
      result[key] = compile(value) as Template;
    } else {
      result[key] = () => value;
    }
  }

  return result;
}
