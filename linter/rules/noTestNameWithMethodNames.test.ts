import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noTestNameWithMethodNamesRule } from './noTestNameWithMethodNames';

describe('noTestNameWithMethodNamesRule', () => {
  test('detects camelCase method names in test descriptions', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("calculateDamage returns correct value", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-method-names');
    expect(errors[0].message).toContain('describe behavior');
  });

  test('detects method names in middle of test description', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("when takeDamage is called health decreases", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-method-names');
  });

  test('allows behavioral test names without method references', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("damage is attack power minus defense", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows test names with lowercase only', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("player with zero health is dead", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('works with it() syntax', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
it("calculateDamage works correctly", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-method-names');
  });

  test('only checks test files', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("calculateDamage returns value", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/lib/game/combat.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows property names in camelCase', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("component with missing xpValue uses default", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows XY coordinates and acronyms', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("player moves in XY coordinates", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('handles test calls without string argument', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test(someVariable, () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('detects function call syntax with parentheses', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test("when myFunction() is invoked result is returned", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-method-names');
  });

  test('handles template literal test names', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
test(\`dynamic test for \${value}\`, () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('ignores non-test call expressions', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithMethodNamesRule);

    const code = `
const result = someFunction("calculateDamage");
otherFunction("getValue returns");
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });
});
