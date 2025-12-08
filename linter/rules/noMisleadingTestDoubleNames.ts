import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const ERROR_MESSAGE = `
The term "mock" has a specific meaning in testing and should only be used for interaction verification.

Our testing philosophy distinguishes between:
- **Mocks**: Test doubles that verify method calls and interactions (vi.mock, vi.spyOn)
- **Fakes**: Test doubles with working implementations but simplified behavior
- **Nullables**: Test doubles with "off switches" to prevent external interactions

Why naming matters:
- "Mock" implies interaction-based testing, which we avoid
- Using "mock" for fakes/nullables creates conceptual confusion
- Clear naming helps maintain our state-based testing philosophy

Naming conventions:
1. Use \`createFake*\` for objects with controlled, working behavior
2. Use \`createNull*\` for objects following the nullables pattern
3. Reserve "mock" prefix only for actual vitest mocks (which we avoid)

Example refactoring:
  // Before: Misleading name
  function createMockEventQueue() {
    return new EventQueue();
  }

  // After: Clear intent
  function createFakeEventQueue() {
    return new EventQueue();
  }

  // Or, for nullable pattern:
  function createNullEventQueue() {
    return EventQueue.createNull();
  }

See CLAUDE.md section "Writing Testable Code > Nullables Pattern" for more details.
`.trim();

function containsVitestMock(text: string): boolean {
  return (
    text.includes('vi.mock') || text.includes('vi.spyOn') || text.includes('vi.fn')
  );
}

export const noMisleadingTestDoubleNamesRule: Rule = {
  name: 'no-misleading-test-double-names',
  check: (node: Node, filePath: string): LintError | null => {
    if (!filePath.endsWith('.test.ts')) {
      return null;
    }

    if (node.type === 'function_declaration') {
      // name field is always present for function_declaration per tree-sitter grammar
      const nameNode = node.childForFieldName('name')!;
      const name = nameNode.text;
      if (!name.startsWith('createMock') && !name.startsWith('makeMock')) {
        return null;
      }

      const bodyNode = node.childForFieldName('body');
      if (bodyNode && containsVitestMock(bodyNode.text)) {
        return null;
      }

      const position = nameNode.startPosition;
      return {
        file: filePath,
        line: position.row + 1,
        column: position.column + 1,
        message: ERROR_MESSAGE,
        ruleName: 'no-misleading-test-double-names'
      };
    }

    if (node.type === 'variable_declarator') {
      // name field is always present for variable_declarator per tree-sitter grammar
      const nameNode = node.childForFieldName('name')!;
      const name = nameNode.text;
      if (!name.startsWith('mock') || name === 'mock') {
        return null;
      }

      const valueNode = node.childForFieldName('value');
      if (valueNode && containsVitestMock(valueNode.text)) {
        return null;
      }

      const position = nameNode.startPosition;
      return {
        file: filePath,
        line: position.row + 1,
        column: position.column + 1,
        message: ERROR_MESSAGE,
        ruleName: 'no-misleading-test-double-names'
      };
    }

    return null;
  }
};
