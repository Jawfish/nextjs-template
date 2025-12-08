import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noViMockedRule } from './noViMocked';

describe('no-vi-mocked rule', () => {
  test('code without vi.mocked has no errors', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockedRule);

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

  test('vi.mocked usage is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockedRule);

    const code = `
      import { test, vi } from 'vitest';
      const mock = vi.mocked(someFunction);
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe('test.ts');
    expect(errors[0].ruleName).toBe('no-vi-mocked');
    expect(errors[0].message).toContain('vi.mocked()');
    expect(errors[0].message).toContain('interaction-based testing');
  });

  test('vi.mocked with options is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockedRule);

    const code = `
      const mock = vi.mocked(fn, { partial: true });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-vi-mocked');
  });

  test('multiple vi.mocked calls are all detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockedRule);

    const code = `
      const mock1 = vi.mocked(fn1);
      const mock2 = vi.mocked(fn2);
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(2);
    expect(errors[1].line).toBe(3);
  });

  test('error message explains state-based testing', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockedRule);

    const code = 'const mock = vi.mocked(fn);';

    const errors = linter.lint('test.ts', code);
    expect(errors[0].message).toContain('state changes');
    expect(errors[0].message).toContain('observable outcomes');
    expect(errors[0].message).toContain('CLAUDE.md');
  });

  test('similar method names are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViMockedRule);

    const code = `
      const result = mocked(fn);
      const data = vi.fn();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });
});
