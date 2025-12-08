import type { LintError } from './types';

export function formatErrors(errors: LintError[]): string {
  if (errors.length === 0) {
    return '';
  }

  return errors
    .map(error => {
      const location = `${error.file}:${error.line}:${error.column}`;
      const header = `\n${location} - ${error.ruleName}`;
      const message = error.message
        .split('\n')
        .map(line => `  ${line}`)
        .join('\n');
      return `${header}\n${message}`;
    })
    .join('\n\n');
}
