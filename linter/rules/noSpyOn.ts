import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const ERROR_MESSAGE = `
vi.spyOn() creates fragile tests that verify implementation rather than behavior.

Our testing philosophy:
- Focus on behavior, not implementation details
- Use state-based testing over interaction-based testing
- Tests should verify what the code does, not how it does it
- Prefer dependency injection with test doubles over mocking

Instead of spying on method calls, test the observable behavior and state changes.
See CLAUDE.md for more details on our testing philosophy.
`.trim();

export const noSpyOnRule: Rule = {
  name: 'no-spy-on',
  check: (node: Node, filePath: string): LintError | null => {
    if (
      node.type === 'call_expression' &&
      node.childForFieldName('function')?.text === 'vi.spyOn'
    ) {
      const position = node.startPosition;
      return {
        file: filePath,
        line: position.row + 1,
        column: position.column + 1,
        message: ERROR_MESSAGE,
        ruleName: 'no-spy-on'
      };
    }
    return null;
  }
};
