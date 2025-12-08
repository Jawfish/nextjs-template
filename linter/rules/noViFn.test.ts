import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noViFnRule } from './noViFn';

describe('no-vi-fn rule', () => {
  test('code without vi.fn has no errors', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `
      import { test, expect } from 'vitest';
      test('example test', () => {
        const callback = (value: string) => captured.push(value);
        service.process(callback);
        expect(captured).toContain('test');
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('vi.fn() usage is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `
      import { test, expect, vi } from 'vitest';
      test('example test', () => {
        const mockFn = vi.fn();
        service.process(mockFn);
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe('test.ts');
    expect(errors[0].ruleName).toBe('no-vi-fn');
    expect(errors[0].message).toContain('vi.fn()');
  });

  test('vi.fn() with implementation is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `const mockFn = vi.fn(() => 'result');`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
  });

  test('mockResolvedValue is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `const mockFn = vi.fn().mockResolvedValue({ data: 'test' });`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(2); // vi.fn() and mockResolvedValue
    expect(errors.some(e => e.message.includes('vi.fn()'))).toBe(true);
  });

  test('mockReturnValue is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `mockFn.mockReturnValue('test');`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-vi-fn');
  });

  test('mockImplementation is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `mockFn.mockImplementation(() => 'result');`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
  });

  test('mockRejectedValue is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `mockFn.mockRejectedValue(new Error('fail'));`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
  });

  test('Once variants are detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `
      mockFn.mockResolvedValueOnce('first');
      mockFn.mockReturnValueOnce('second');
      mockFn.mockRejectedValueOnce(new Error());
      mockFn.mockImplementationOnce(() => 'third');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(4);
  });

  test('multiple vi.fn() usages are all detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `
      const mock1 = vi.fn();
      const mock2 = vi.fn();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(2);
    expect(errors[1].line).toBe(3);
  });

  test('error includes correct line and column', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = 'const mock = vi.fn();';

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
    expect(errors[0].column).toBe(14);
  });

  test('similar method names are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = `
      const result = fn();
      const value = obj.mockValue();
      const data = vi.something();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('error message explains testing philosophy', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViFnRule);

    const code = 'vi.fn();';

    const errors = linter.lint('test.ts', code);
    expect(errors[0].message).toContain('behavior');
    expect(errors[0].message).toContain('test doubles');
    expect(errors[0].message).toContain('CLAUDE.md');
  });
});
