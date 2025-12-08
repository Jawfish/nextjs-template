import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noInteractionAssertionsRule } from './noInteractionAssertions';

describe('no-interaction-assertions rule', () => {
  test('code without interaction assertions has no errors', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      import { test, expect } from 'vitest';
      test('example test', () => {
        const result = calculate(5);
        expect(result).toBe(10);
        expect(result).toEqual({ value: 10 });
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('toHaveBeenCalled is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(spy).toHaveBeenCalled();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-interaction-assertions');
    expect(errors[0].message).toContain('Interaction-based assertions');
  });

  test('toHaveBeenCalledWith is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(spy).toHaveBeenCalledWith('arg1', 'arg2');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-interaction-assertions');
  });

  test('toHaveBeenCalledTimes is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(spy).toHaveBeenCalledTimes(3);
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-interaction-assertions');
  });

  test('toHaveBeenNthCalledWith is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(spy).toHaveBeenNthCalledWith(2, 'arg');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-interaction-assertions');
  });

  test('toHaveBeenLastCalledWith is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(spy).toHaveBeenLastCalledWith('arg');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-interaction-assertions');
  });

  test('multiple interaction assertions are all detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalledWith('arg');
      expect(spy3).toHaveBeenCalledTimes(2);
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(3);
  });

  test('error message explains behavior-based testing', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = 'expect(spy).toHaveBeenCalled();';

    const errors = linter.lint('test.ts', code);
    expect(errors[0].message).toContain('observable behavior');
    expect(errors[0].message).toContain('state changes');
    expect(errors[0].message).toContain('CLAUDE.md');
  });

  test('other expect assertions are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      expect(result).toBe(5);
      expect(value).toEqual({ x: 10 });
      expect(array).toHaveLength(3);
      expect(str).toContain('test');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('interaction assertions in different contexts are detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noInteractionAssertionsRule);

    const code = `
      test('nested', () => {
        function verify() {
          expect(spy).toHaveBeenCalled();
        }
        verify();
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
  });
});
