import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const STUB_FUNCTIONS = ['vi.stubGlobal', 'vi.stubEnv'];

const ERROR_MESSAGE = `
vi.stubGlobal() and vi.stubEnv() create implicit dependencies that make tests brittle and hard to understand.

Our testing philosophy:
- Make dependencies explicit through function parameters or constructor injection
- Avoid relying on global state or environment variables in business logic
- Tests should not depend on or modify shared global state

Instead of stubbing globals or environment:
1. Pass configuration as explicit parameters to functions
2. Use dependency injection for services that need environment values
3. Create configuration objects that can be easily swapped in tests

Example refactoring:
  // Before: Stubbing globals/environment
  vi.stubGlobal('fetch', fakeFetch);
  vi.stubEnv('API_URL', 'http://test.com');

  // After: Explicit dependencies
  function createApiClient(config: { baseUrl: string; fetch: typeof fetch }) {
    return { /* use config.baseUrl and config.fetch */ };
  }

  // In test:
  const client = createApiClient({
    baseUrl: 'http://test.com',
    fetch: fakeFetch
  });

See CLAUDE.md for more details on our testing philosophy.
`.trim();

export const noViStubRule: Rule = {
  name: 'no-vi-stub',
  check: (node: Node, filePath: string): LintError | null => {
    if (node.type !== 'call_expression') return null;

    // function field is always present for call_expression per tree-sitter grammar
    const functionText = node.childForFieldName('function')!.text;
    if (!STUB_FUNCTIONS.includes(functionText)) return null;

    const position = node.startPosition;
    return {
      file: filePath,
      line: position.row + 1,
      column: position.column + 1,
      message: ERROR_MESSAGE,
      ruleName: 'no-vi-stub'
    };
  }
};
