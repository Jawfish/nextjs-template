import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const MOCK_METHODS = [
  'mockResolvedValue',
  'mockResolvedValueOnce',
  'mockRejectedValue',
  'mockRejectedValueOnce',
  'mockReturnValue',
  'mockReturnValueOnce',
  'mockImplementation',
  'mockImplementationOnce'
];

const ERROR_MESSAGE = `
vi.fn() and mock methods create brittle tests that verify implementation rather than behavior.

Our testing philosophy:
- Test behavior and state changes, not method calls
- Use real test doubles with controllable behavior instead of mock functions
- Tests should verify what the code does, not how it does it

Instead of mock functions:
1. Use plain functions or objects that return controlled values
2. Capture state in a variable to verify what was passed
3. Assert on outputs and state changes, not on calls

Example refactoring:
  // Before: Mock function with chained methods
  const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
  await service.process(mockFn);
  expect(mockFn).toHaveBeenCalledWith('input');

  // After: Test double with state capture
  const captured: { input: string | null } = { input: null };
  const fn = async (input: string) => {
    captured.input = input;
    return { data: 'test' };
  };
  await service.process(fn);
  expect(captured.input).toBe('input');

See CLAUDE.md for more details on our testing philosophy.
`.trim();

export const noViFnRule: Rule = {
  name: 'no-vi-fn',
  check: (node: Node, filePath: string): LintError | null => {
    // Detect vi.fn() calls
    if (
      node.type === 'call_expression' &&
      node.childForFieldName('function')?.text === 'vi.fn'
    ) {
      const position = node.startPosition;
      return {
        file: filePath,
        line: position.row + 1,
        column: position.column + 1,
        message: ERROR_MESSAGE,
        ruleName: 'no-vi-fn'
      };
    }

    // Detect mock method calls like .mockResolvedValue(), .mockReturnValue(), etc.
    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      if (functionNode?.type === 'member_expression') {
        const propertyNode = functionNode.childForFieldName('property');
        if (propertyNode && MOCK_METHODS.includes(propertyNode.text)) {
          const position = node.startPosition;
          return {
            file: filePath,
            line: position.row + 1,
            column: position.column + 1,
            message: ERROR_MESSAGE,
            ruleName: 'no-vi-fn'
          };
        }
      }
    }

    return null;
  }
};
