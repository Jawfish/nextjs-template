import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noMisleadingTestDoubleNamesRule } from './noMisleadingTestDoubleNames';

describe('noMisleadingTestDoubleNamesRule', () => {
  test('function with mock naming is flagged when not using vitest mocks', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createMockEventQueue() {
  return new EventQueue();
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-misleading-test-double-names');
    expect(errors[0].message).toContain('createFake');
  });

  test('detects mock variables without vitest mocks', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
const mockQueue = new EventQueue();
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-misleading-test-double-names');
  });

  test('fake naming is permitted for test doubles', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createFakeEventQueue() {
  return new EventQueue();
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('null naming is permitted for test doubles', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createNullEventQueue() {
  return EventQueue.createNull();
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows actual vitest mocks with mock naming', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createMockApi() {
  return vi.fn();
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('only checks test files', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createMockEventQueue() {
  return new EventQueue();
}
`;

    const errors = linter.lint('src/lib/game/helpers.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows fake prefix for variables', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
const fakeQueue = new EventQueue();
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows variable named just mock', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
const mock = someFunction();
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows vitest mock in function body with vi.mock', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createMockApi() {
  vi.mock('./api');
  return {};
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows vitest mock in function body with vi.spyOn', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function createMockLogger() {
  const logger = new Logger();
  vi.spyOn(logger, 'log');
  return logger;
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('factory function with misleading mock prefix is flagged when not using vitest', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
function makeMockQueue() {
  return new EventQueue();
}
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-misleading-test-double-names');
  });

  test('allows mock variable when using vi.fn', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
const mockApi = vi.fn();
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows mock variable when using vi.spyOn', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
const mockLogger = vi.spyOn(console, 'log');
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });

  test('allows mock variable when using vi.mock', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noMisleadingTestDoubleNamesRule);

    const code = `
const mockModule = vi.mock('./module');
`;

    const errors = linter.lint('src/test.test.ts', code);

    expect(errors).toHaveLength(0);
  });
});
