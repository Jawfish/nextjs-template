import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noViMockRule } from './noViMock';

describe('no-vi-mock rule', () => {
  test('code without vi.mock has no errors', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `
      import { test, expect } from 'vitest';
      test('example test', () => {
        const result = calculate(5);
        expect(result).toBe(10);
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('vi.mock usage is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `
      import { test, vi } from 'vitest';
      vi.mock('./api');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe('test.ts');
    expect(errors[0].ruleName).toBe('no-vi-mock');
    expect(errors[0].message).toContain('vi.mock()');
    expect(errors[0].message).toContain('dependency injection');
  });

  test('vi.mock with factory function is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `
      vi.mock('./module', () => ({ default: vi.fn() }));
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-vi-mock');
  });

  test('vi.doMock is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `vi.doMock('./module', () => ({ default: 'mocked' }));`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-vi-mock');
    expect(errors[0].message).toContain('vi.doMock()');
  });

  test('multiple vi.mock calls are all detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `
      vi.mock('./api');
      vi.mock('./database');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(2);
    expect(errors[1].line).toBe(3);
  });

  test('error message explains alternative approaches', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `vi.mock('./api');`;

    const errors = linter.lint('test.ts', code);
    expect(errors[0].message).toContain('nullable');
    expect(errors[0].message).toContain('factory methods');
    expect(errors[0].message).toContain('CLAUDE.md');
  });

  test('similar method names are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockRule);

    const code = `
      const result = mock('./api');
      const data = vi.fn();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });
});
