import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import {
  createNoPrimitiveObsessionRule,
  type NoPrimitiveObsessionConfig
} from './noPrimitiveObsession';

const testConfig: NoPrimitiveObsessionConfig = {
  enforcedPaths: ['src/domain'],
  exemptPaths: ['**/mapper.ts'],
  exemptParams: ['count', 'index', 'offset', 'limit'],
  primitives: ['string', 'number', 'boolean']
};

describe('no-primitive-obsession rule', () => {
  async function lint(filePath: string, code: string) {
    const linter = new Linter();
    await linter.init();
    linter.addRule(createNoPrimitiveObsessionRule(testConfig));
    return linter.lint(filePath, code);
  }

  describe('flags primitive parameters in domain layer', () => {
    test('function with string parameter in domain repository', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Primitive type 'string'");
      expect(errors[0].message).toContain("parameter 'id'");
      expect(errors[0].ruleName).toBe('no-primitive-obsession');
    });

    test('arrow function with string parameter in domain service', async () => {
      const code = 'const fn = (email: string) => { return email; };';
      const errors = await lint('src/domain/user/service.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Primitive type 'string'");
      expect(errors[0].message).toContain("parameter 'email'");
    });

    test('class method with number parameter in domain repository', async () => {
      const code = 'class Repo { find(id: number) { return id; } }';
      const errors = await lint('src/domain/order/repository.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Primitive type 'number'");
      expect(errors[0].message).toContain("parameter 'id'");
    });

    test('function with boolean parameter in domain layer', async () => {
      const code = 'function process(isActive: boolean) { return isActive; }';
      const errors = await lint('src/domain/task/logic.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Primitive type 'boolean'");
      expect(errors[0].message).toContain("parameter 'isActive'");
    });
  });

  describe('passes for valid code', () => {
    test('function with branded type annotation', async () => {
      const code = 'function getTask(id: TaskId) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('function with string parameter outside enforced path', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src/db/queries.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('function with string parameter in exempt path pattern', async () => {
      const code = 'function toTask(id: string) { return id; }';
      const errors = await lint('src/domain/task/mapper.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('function with exempt parameter names', async () => {
      const code =
        'function paginate(offset: number, limit: number) { return [offset, limit]; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('function in test file', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src/domain/task/repository.test.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('function without type annotation', async () => {
      const code = 'function getTask(id) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('arrow function with branded type annotation', async () => {
      const code = 'const fn = (id: UserId) => { return id; };';
      const errors = await lint('src/domain/user/service.ts', code);
      expect(errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('optional parameter with primitive type', async () => {
      const code = 'function get(id?: string) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Primitive type 'string'");
    });

    test('custom exempt path patterns work', async () => {
      const customConfig: NoPrimitiveObsessionConfig = {
        enforcedPaths: ['src/domain'],
        exemptPaths: ['**/schema.ts', '**/types.ts'],
        exemptParams: [],
        primitives: ['string', 'number', 'boolean']
      };

      const linter = new Linter();
      await linter.init();
      linter.addRule(createNoPrimitiveObsessionRule(customConfig));

      const code = 'function validate(id: string) { return id; }';
      const schemaErrors = linter.lint('src/domain/task/schema.ts', code);
      expect(schemaErrors).toHaveLength(0);

      const typesErrors = linter.lint('src/domain/task/types.ts', code);
      expect(typesErrors).toHaveLength(0);

      const repoErrors = linter.lint('src/domain/task/repository.ts', code);
      expect(repoErrors).toHaveLength(1);
    });

    test('multiple parameters where only some are primitives', async () => {
      const code =
        'function update(id: string, data: TaskData, count: number) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      // 'id: string' is flagged, 'data: TaskData' is not primitive, 'count: number' is exempt param
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("parameter 'id'");
    });

    test('empty enforcedPaths does not flag anything', async () => {
      const emptyConfig: NoPrimitiveObsessionConfig = {
        enforcedPaths: [],
        exemptPaths: [],
        exemptParams: [],
        primitives: ['string', 'number', 'boolean']
      };

      const linter = new Linter();
      await linter.init();
      linter.addRule(createNoPrimitiveObsessionRule(emptyConfig));

      const code = 'function getTask(id: string) { return id; }';
      const errors = linter.lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('test file with .test.tsx extension is exempt', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src/domain/task/component.test.tsx', code);
      expect(errors).toHaveLength(0);
    });

    test('error message suggests branded type name', async () => {
      const code = 'function getUser(userId: string) { return userId; }';
      const errors = await lint('src/domain/user/repository.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('UserId');
    });

    test('error message lists exempt params', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain(
        'Exempt params: [count, index, offset, limit]'
      );
    });

    test('only first primitive parameter is reported per function', async () => {
      // The rule returns early after finding the first violation
      const code = 'function process(id: string, name: string) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("parameter 'id'");
    });

    test('nested domain path is enforced', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src/domain/task/state/service.ts', code);
      expect(errors).toHaveLength(1);
    });

    test('windows-style path separators are normalized', async () => {
      const code = 'function getTask(id: string) { return id; }';
      const errors = await lint('src\\domain\\task\\repository.ts', code);
      expect(errors).toHaveLength(1);
    });

    test('function with no parameters passes', async () => {
      const code = 'function noParams() { return 42; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('single param arrow without parens passes (no type annotation possible)', async () => {
      const code = 'const fn = x => x + 1;';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('rest parameters are skipped', async () => {
      const code = 'function withRest(...args: string[]) { return args; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('destructured parameters are skipped', async () => {
      const code = 'function withDestructure({ id }: { id: string }) { return id; }';
      const errors = await lint('src/domain/task/repository.ts', code);
      expect(errors).toHaveLength(0);
    });

    test('direct substring exempt path (not starting with **/) works', async () => {
      const customConfig: NoPrimitiveObsessionConfig = {
        enforcedPaths: ['src/domain'],
        exemptPaths: ['infrastructure'],
        exemptParams: [],
        primitives: ['string']
      };

      const linter = new Linter();
      await linter.init();
      linter.addRule(createNoPrimitiveObsessionRule(customConfig));

      const code = 'function getTask(id: string) { return id; }';
      const errors = linter.lint('src/domain/infrastructure/adapter.ts', code);
      expect(errors).toHaveLength(0);
    });
  });
});
