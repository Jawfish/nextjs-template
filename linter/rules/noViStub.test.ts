import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noViStubRule } from './noViStub';

describe('no-vi-stub rule', () => {
  test('code without vi.stubGlobal or vi.stubEnv has no errors', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `
      import { test, expect } from 'vitest';
      test('example test', () => {
        const config = { apiUrl: 'http://test.com' };
        const result = createClient(config);
        expect(result).toBeDefined();
      });
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('vi.stubGlobal is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `vi.stubGlobal('fetch', fakeFetch);`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe('test.ts');
    expect(errors[0].ruleName).toBe('no-vi-stub');
    expect(errors[0].message).toContain('vi.stubGlobal()');
  });

  test('vi.stubEnv is detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `vi.stubEnv('API_URL', 'http://test.com');`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-vi-stub');
    expect(errors[0].message).toContain('vi.stubEnv()');
  });

  test('multiple stub calls are all detected', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `
      vi.stubGlobal('fetch', fakeFetch);
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubGlobal('localStorage', fakeStorage);
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(3);
    expect(errors[0].line).toBe(2);
    expect(errors[1].line).toBe(3);
    expect(errors[2].line).toBe(4);
  });

  test('error message explains alternative approaches', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `vi.stubGlobal('fetch', fakeFetch);`;

    const errors = linter.lint('test.ts', code);
    expect(errors[0].message).toContain('dependency injection');
    expect(errors[0].message).toContain('explicit');
    expect(errors[0].message).toContain('CLAUDE.md');
  });

  test('similar method names are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `
      const result = stubGlobal('fetch');
      const env = stubEnv('NODE_ENV');
      const data = vi.fn();
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('computed/dynamic call expressions are not flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `
      const method = 'stubGlobal';
      vi[method]('fetch', fake);
      obj['stubEnv']('NODE_ENV');
      (getStubFn())('fetch');
    `;

    const errors = linter.lint('test.ts', code);
    expect(errors).toEqual([]);
  });

  test('error includes correct line and column', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noViStubRule);

    const code = `vi.stubGlobal('fetch', fakeFetch);`;

    const errors = linter.lint('test.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
    expect(errors[0].column).toBe(1);
  });
});
