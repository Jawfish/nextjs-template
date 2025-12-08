import { describe, expect, test } from 'vitest';
import { Linter } from './linter';
import type { Rule } from './types';

describe('Linter', () => {
  test('linter with no rules returns no errors', async () => {
    const linter = new Linter();
    await linter.init();
    const errors = linter.lint('test.ts', 'const x = 1;');
    expect(errors).toEqual([]);
  });

  test('linter runs registered rule on code', async () => {
    const linter = new Linter();
    await linter.init();
    const rule: Rule = {
      name: 'test-rule',
      check: (node, filePath) => {
        if (node.type === 'identifier' && node.text === 'forbidden') {
          return {
            file: filePath,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            message: 'forbidden identifier',
            ruleName: 'test-rule'
          };
        }
        return null;
      }
    };

    linter.addRule(rule);
    const errors = linter.lint('test.ts', 'const forbidden = 1;');

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      file: 'test.ts',
      line: 1,
      column: 7,
      message: 'forbidden identifier',
      ruleName: 'test-rule'
    });
  });

  test('linter runs multiple rules on code', async () => {
    const linter = new Linter();
    await linter.init();

    const rule1: Rule = {
      name: 'rule-1',
      check: (node, filePath) => {
        if (node.type === 'identifier' && node.text === 'foo') {
          return {
            file: filePath,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            message: 'foo not allowed',
            ruleName: 'rule-1'
          };
        }
        return null;
      }
    };

    const rule2: Rule = {
      name: 'rule-2',
      check: (node, filePath) => {
        if (node.type === 'identifier' && node.text === 'bar') {
          return {
            file: filePath,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            message: 'bar not allowed',
            ruleName: 'rule-2'
          };
        }
        return null;
      }
    };

    linter.addRule(rule1);
    linter.addRule(rule2);

    const errors = linter.lint('test.ts', 'const foo = 1; const bar = 2;');

    expect(errors).toHaveLength(2);
    expect(errors[0].ruleName).toBe('rule-1');
    expect(errors[1].ruleName).toBe('rule-2');
  });

  test('linter finds all occurrences of violation', async () => {
    const linter = new Linter();
    await linter.init();
    const rule: Rule = {
      name: 'test-rule',
      check: (node, filePath) => {
        if (node.type === 'identifier' && node.text === 'bad') {
          return {
            file: filePath,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            message: 'bad identifier',
            ruleName: 'test-rule'
          };
        }
        return null;
      }
    };

    linter.addRule(rule);
    const errors = linter.lint('test.ts', 'const bad = 1; const bad2 = bad;');

    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(1);
    expect(errors[0].column).toBe(7);
    expect(errors[1].line).toBe(1);
    expect(errors[1].column).toBe(29);
  });

  test('linter handles multiline code correctly', async () => {
    const linter = new Linter();
    await linter.init();
    const rule: Rule = {
      name: 'test-rule',
      check: (node, filePath) => {
        if (node.type === 'identifier' && node.text === 'target') {
          return {
            file: filePath,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            message: 'target found',
            ruleName: 'test-rule'
          };
        }
        return null;
      }
    };

    linter.addRule(rule);
    const code = `const x = 1;
const target = 2;
const y = 3;`;
    const errors = linter.lint('test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
    expect(errors[0].column).toBe(7);
  });

  test('linter throws error when not initialized', () => {
    const linter = new Linter();
    expect(() => linter.lint('test.ts', 'const x = 1;')).toThrow(
      'Linter not initialized'
    );
  });

  test('calling init multiple times does not re-initialize', async () => {
    const linter = new Linter();
    await linter.init();
    await linter.init();
    const errors = linter.lint('test.ts', 'const x = 1;');
    expect(errors).toEqual([]);
  });
});
