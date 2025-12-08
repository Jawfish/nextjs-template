import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noSpyOnRule } from './noSpyOn';

describe('no-spy-on rule', () => {
  test('code without vi.spyOn has no errors', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

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

  test('vi.spyOn usage is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

    const code = `
      import { test, expect, vi } from 'vitest';
      test('example test', () => {
        const spy = vi.spyOn(console, 'log');
        doSomething();
        expect(spy).toHaveBeenCalled();
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe('test.ts');
    expect(errors[0].ruleName).toBe('no-spy-on');
    expect(errors[0].message).toContain('vi.spyOn()');
    expect(errors[0].message).toContain('behavior');
  });

  test('multiple vi.spyOn usages are all detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

    const code = `
      const spy1 = vi.spyOn(obj, 'method1');
      const spy2 = vi.spyOn(obj, 'method2');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(2);
    expect(errors[1].line).toBe(3);
  });

  test('vi.spyOn in nested function is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

    const code = `
      test('nested spy', () => {
        function setup() {
          return vi.spyOn(obj, 'method');
        }
        const spy = setup();
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(4);
  });

  test('error includes correct line and column', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

    const code = `const spy = vi.spyOn(obj, 'method');`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
    expect(errors[0].column).toBe(13);
  });

  test('similar method names are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

    const code = `
      const result = vi.spy();
      const mock = spyOn(obj, 'method');
      const value = vi.spyOnProperty();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('error message explains testing philosophy', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noSpyOnRule);

    const code = `vi.spyOn(obj, 'method');`;

    const errors = linter.lint('test.ts', code);
    expect(errors[0].message).toContain('Focus on behavior');
    expect(errors[0].message).toContain('state-based testing');
    expect(errors[0].message).toContain('CLAUDE.md');
  });
});
