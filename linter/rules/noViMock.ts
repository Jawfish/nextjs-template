import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const MOCK_FUNCTIONS = ['vi.mock', 'vi.doMock'];

const ERROR_MESSAGE = `
vi.mock() and vi.doMock() create brittle tests that rely on implementation details rather than behavior.

Our testing philosophy:
- Write narrow, sociable tests that use real dependencies
- Separate business logic from infrastructure to make it testable
- Use dependency injection with test doubles (nullables pattern) instead of module mocking

Instead of mocking modules:
1. Extract pure logic into separate functions that don't need mocking
2. Use constructor injection or factory methods to provide test implementations
3. Create "nullable" versions of infrastructure classes with controllable behavior

Example refactoring:
  // Before: Mocking a module
  vi.mock('./api', () => ({ fetchUser: vi.fn() }))

  // After: Dependency injection
  class UserService {
    constructor(private api: ApiClient) {}
    static createNull(responses = {}) {
      return new UserService(new FakeApiClient(responses));
    }
  }

See CLAUDE.md for more details on our testing philosophy.
`.trim();

export const noViMockRule: Rule = {
  name: 'no-vi-mock',
  check: (node: Node, filePath: string): LintError | null => {
    if (node.type !== 'call_expression') return null;

    // function field is always present for call_expression per tree-sitter grammar
    const functionText = node.childForFieldName('function')!.text;
    if (!MOCK_FUNCTIONS.includes(functionText)) return null;

    const position = node.startPosition;
    return {
      file: filePath,
      line: position.row + 1,
      column: position.column + 1,
      message: ERROR_MESSAGE,
      ruleName: 'no-vi-mock'
    };
  }
};
