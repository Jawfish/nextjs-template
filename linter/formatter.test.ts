import { describe, expect, test } from 'vitest';
import { formatErrors } from './formatter';
import type { LintError } from './types';

describe('formatErrors', () => {
  test('empty errors array returns empty string', () => {
    const result = formatErrors([]);
    expect(result).toBe('');
  });

  test('single error is formatted with file location and message', () => {
    const errors: LintError[] = [
      {
        file: 'src/test.ts',
        line: 10,
        column: 5,
        message: 'Test error message',
        ruleName: 'test-rule'
      }
    ];

    const result = formatErrors(errors);
    expect(result).toContain('src/test.ts:10:5');
    expect(result).toContain('test-rule');
    expect(result).toContain('Test error message');
  });

  test('multiline error message is indented', () => {
    const errors: LintError[] = [
      {
        file: 'test.ts',
        line: 1,
        column: 1,
        message: 'Line 1\nLine 2\nLine 3',
        ruleName: 'test-rule'
      }
    ];

    const result = formatErrors(errors);
    expect(result).toContain('  Line 1');
    expect(result).toContain('  Line 2');
    expect(result).toContain('  Line 3');
  });

  test('multiple errors are separated by blank lines', () => {
    const errors: LintError[] = [
      {
        file: 'file1.ts',
        line: 1,
        column: 1,
        message: 'Error 1',
        ruleName: 'rule-1'
      },
      {
        file: 'file2.ts',
        line: 2,
        column: 2,
        message: 'Error 2',
        ruleName: 'rule-2'
      }
    ];

    const result = formatErrors(errors);
    expect(result).toContain('file1.ts:1:1');
    expect(result).toContain('file2.ts:2:2');
    expect(result).toMatch(/Error 1\n\n.*Error 2/s);
  });

  test('error format includes rule name', () => {
    const errors: LintError[] = [
      {
        file: 'test.ts',
        line: 5,
        column: 10,
        message: 'Message',
        ruleName: 'no-spy-on'
      }
    ];

    const result = formatErrors(errors);
    expect(result).toContain('no-spy-on');
  });
});
