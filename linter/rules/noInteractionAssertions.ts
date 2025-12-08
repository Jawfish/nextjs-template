import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const FORBIDDEN_ASSERTIONS = [
  'toHaveBeenCalled',
  'toHaveBeenCalledWith',
  'toHaveBeenCalledTimes',
  'toHaveBeenNthCalledWith',
  'toHaveBeenLastCalledWith'
];

const ERROR_MESSAGE = `
Interaction-based assertions test implementation details rather than behavior.

Our testing philosophy:
- Focus on what the code does (outputs, state changes) not how it does it
- State-based assertions are more resistant to refactoring
- Tests should verify observable behavior, not internal method calls

Why this matters:
- Your test breaks when you refactor, even if behavior is unchanged
- It couples tests to implementation, making code harder to change
- It doesn't verify the code actually works, just that methods were called

Instead of verifying method calls:
1. Assert on the final state or output of the operation
2. Check for observable side effects (DOM changes, state updates, etc.)
3. Verify the behavior from the user's perspective

Example refactoring:
  // Before: Testing implementation (fragile)
  const spy = vi.spyOn(logger, 'log');
  processOrder(order);
  expect(spy).toHaveBeenCalledWith('Order processed');

  // After: Testing behavior (robust)
  const result = processOrder(order);
  expect(result.status).toBe('completed');
  expect(result.message).toBe('Order processed');

See CLAUDE.md for more details on behavior-driven testing.
`.trim();

export const noInteractionAssertionsRule: Rule = {
  name: 'no-interaction-assertions',
  check: (node: Node, filePath: string): LintError | null => {
    if (node.type === 'member_expression') {
      const propertyNode = node.childForFieldName('property') as Node;
      if (FORBIDDEN_ASSERTIONS.includes(propertyNode.text as string)) {
        const position = node.startPosition;
        return {
          file: filePath,
          line: position.row + 1,
          column: position.column + 1,
          message: ERROR_MESSAGE,
          ruleName: 'no-interaction-assertions'
        };
      }
    }
    return null;
  }
};
