import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const ERROR_MESSAGE = `
Test names should describe behavior, not reference implementation methods.

Our test naming philosophy:
- Focus on what the system does, not how it's tested
- Use plain English that non-programmers can understand
- Follow the ACE framework: Action, Condition, Expectation
- Tests document behavior, not code structure

Why avoid method names in tests:
- Tests coupled to method names break when you refactor
- Method names are implementation details, not user behavior
- Tests should survive renaming and restructuring
- Behavior is what matters, not the specific function name

Naming pattern to follow:
1. **Action**: What functionality is being tested
2. **Condition**: Under what circumstances
3. **Expectation**: With what expected result

Example refactoring:
  // Before: References method name
  test("calculateDamage returns correct value")
  test("takeDamage reduces health")
  test("isPlayerDead checks zero health")

  // After: Describes behavior
  test("damage is attack power minus defense")
  test("health decreases when player takes damage")
  test("player with zero health is dead")

See CLAUDE.md section "Test Naming" for more details and examples.
`.trim();

function looksLikeFunctionCall(str: string): boolean {
  const commonMethodPatterns = [
    /^(get|set|is|has|should|can|will|create|update|delete|remove|add|insert|fetch|load|save|clear|reset|initialize|calculate|compute|process|handle|validate|check|verify|test|run|execute|apply|perform|take|give|make)[A-Z]/,
    /^[a-z]+[A-Z][a-z]+\([^)]*\)/
  ];

  return commonMethodPatterns.some(pattern => pattern.test(str));
}

function extractTestName(node: Node): string | null {
  // arguments field is always present for call_expression per tree-sitter grammar
  const args = node.childForFieldName('arguments')!;

  for (let i = 0; i < args.namedChildCount; i++) {
    const arg = args.namedChild(i);
    if (arg?.type === 'string') {
      const text = arg.text;
      return text.substring(1, text.length - 1);
    }
  }
  return null;
}

export const noTestNameWithMethodNamesRule: Rule = {
  name: 'no-test-name-with-method-names',
  check: (node: Node, filePath: string): LintError | null => {
    if (!filePath.endsWith('.test.ts')) {
      return null;
    }

    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      const functionName = functionNode?.text;

      if (functionName === 'test' || functionName === 'it') {
        const testName = extractTestName(node);
        if (!testName) return null;

        const words = testName.split(' ');
        for (const word of words) {
          if (looksLikeFunctionCall(word)) {
            const position = node.startPosition;
            return {
              file: filePath,
              line: position.row + 1,
              column: position.column + 1,
              message: ERROR_MESSAGE,
              ruleName: 'no-test-name-with-method-names'
            };
          }
        }
      }
    }

    return null;
  }
};
