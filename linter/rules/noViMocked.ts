import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const ERROR_MESSAGE = `
vi.mocked() is a TypeScript helper for mocked functions, which encourages interaction-based testing.

Our testing philosophy:
- Test behavior and state changes, not method calls
- Avoid verifying implementation details like which methods were called
- Focus on observable outcomes rather than internal interactions

Instead of using mocked functions:
1. Test the actual behavior and state changes of your code
2. Use real dependencies or test doubles that track observable state
3. Design code to be testable through its public interface

Example refactoring:
  // Before: Testing implementation with mocks
  const mockFn = vi.mocked(someFunction);
  doSomething();
  expect(mockFn).toHaveBeenCalledWith(expectedArg);

  // After: Testing behavior
  const result = doSomething();
  expect(result).toEqual(expectedOutput);

See CLAUDE.md for more details on state-based vs interaction-based testing.
`.trim();

export const noViMockedRule: Rule = {
  name: 'no-vi-mocked',
  check: (node: Node, filePath: string): LintError | null => {
    if (
      node.type === 'call_expression' &&
      node.childForFieldName('function')?.text === 'vi.mocked'
    ) {
      const position = node.startPosition;
      return {
        file: filePath,
        line: position.row + 1,
        column: position.column + 1,
        message: ERROR_MESSAGE,
        ruleName: 'no-vi-mocked'
      };
    }
    return null;
  }
};
