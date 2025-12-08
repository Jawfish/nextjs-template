import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const ERROR_MESSAGE = `
Test names should state facts, not wishes or expectations using "should".

Our test naming philosophy:
- A test is an atomic fact about system behavior
- Tests are specifications, not aspirations
- Use declarative language that states what IS, not what SHOULD BE
- Tests document actual behavior with confidence

Why avoid "should":
- "Should" sounds aspirational or uncertain
- Tests verify facts, not hypotheticals
- Weakens the authority of tests as specifications
- Creates distance between test and the behavior it verifies

Example refactoring:
  // Before: Aspirational language
  test("player should respawn at checkpoint")
  test("game should pause when window loses focus")
  test("damage should not exceed max health")

  // After: Factual language
  test("player respawns at checkpoint")
  test("game pauses when window loses focus")
  test("damage does not exceed max health")

This is a simple but important distinction - your tests are executable specifications
of how the system behaves, not suggestions for how it might behave.

See CLAUDE.md section "Test Naming > State Facts, Not Expectations" for more details.
`.trim();

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

export const noTestNameWithShouldRule: Rule = {
  name: 'no-test-name-with-should',
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

        if (testName.includes('should')) {
          const position = node.startPosition;
          return {
            file: filePath,
            line: position.row + 1,
            column: position.column + 1,
            message: ERROR_MESSAGE,
            ruleName: 'no-test-name-with-should'
          };
        }
      }
    }

    return null;
  }
};
