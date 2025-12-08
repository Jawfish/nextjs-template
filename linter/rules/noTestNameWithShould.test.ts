import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noTestNameWithShouldRule } from './noTestNameWithShould';

describe('noTestNameWithShouldRule', () => {
  test('aspirational language in test names is flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test("player should respawn at checkpoint", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-should');
    expect(errors[0].message).toContain('state facts');
  });

  test('aspirational language anywhere in test name is flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test("game should pause when window loses focus", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-should');
  });

  test('factual test names are permitted', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test("player respawns at checkpoint", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows declarative statements', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test("game pauses when window loses focus", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('works with it() syntax', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
it("should return correct value", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-test-name-with-should');
  });

  test('only checks test files', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test("should work", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/lib/game/combat.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows negative factual statements', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test("damage does not exceed max health", () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('handles test calls without string argument', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noTestNameWithShouldRule);

    const code = `
test(someVariable, () => {
  expect(true).toBe(true);
});
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });
});
