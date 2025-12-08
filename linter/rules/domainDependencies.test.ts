import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import {
  createDomainDependenciesRule,
  type DomainDependenciesConfig
} from './domainDependencies';

const testConfig: DomainDependenciesConfig = {
  domainPath: 'src/domain',
  importAlias: '@/domain',
  rootFiles: ['cache'],
  dependencies: {
    step: [],
    handler: [],
    project: [],
    tag: [],
    user: [],
    task: ['step'],
    hook: ['task'],
    executor: ['handler', 'task'],
    import: ['step', 'task'],
    integration: ['*']
  }
};

describe('domain-dependencies rule', () => {
  async function lint(filePath: string, code: string) {
    const linter = new Linter();
    await linter.init();
    linter.addRule(createDomainDependenciesRule(testConfig));
    return linter.lint(filePath, code);
  }

  test('allows self-imports within a domain', async () => {
    const code = `import { Task } from '@/domain/task/types';`;
    const errors = await lint('src/domain/task/repository.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('allows imports from non-domain paths', async () => {
    const code = `
      import { ok } from '@/lib/result';
      import { nanoid } from '@/lib/nanoid';
      import { Button } from '@/components/ui';
    `;
    const errors = await lint('src/domain/task/repository.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('allows imports from domain root files like cache', async () => {
    const code = `import { withCache } from '@/domain/cache';`;
    const errors = await lint('src/domain/task/cached.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('allows configured domain imports', async () => {
    const code = `
      import { createTaskRepository } from '@/domain/task/repository';
      import { createStepRepository } from '@/domain/step/repository';
    `;
    const errors = await lint('src/domain/import/processor.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('blocks unconfigured domain imports', async () => {
    const code = `import { createImportRepository } from '@/domain/import/repository';`;
    const errors = await lint('src/domain/task/repository.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(
      "Domain 'task' cannot import from domain 'import'"
    );
  });

  test('blocks imports between unrelated leaf domains', async () => {
    const code = `import { Handler } from '@/domain/handler/types';`;
    const errors = await lint('src/domain/project/service.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(
      "Domain 'project' cannot import from domain 'handler'"
    );
  });

  test('blocks leaf domains from importing anything', async () => {
    const code = `import { Step } from '@/domain/step/types';`;
    const errors = await lint('src/domain/handler/logic.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Allowed domain imports: [none]');
  });

  test('allows wildcard domain imports for integration domain', async () => {
    const code = `
      import { createTaskRepository } from '@/domain/task/repository';
      import { createStepRepository } from '@/domain/step/repository';
      import { createImportRepository } from '@/domain/import/repository';
    `;
    const errors = await lint('src/domain/integration/helpers.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('skips test files entirely', async () => {
    const code = `
      import { createStepRepository } from '@/domain/step/repository';
      import { createImportRepository } from '@/domain/import/repository';
    `;
    const errors = await lint('src/domain/handler/repository.test.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('ignores files not in a domain', async () => {
    const code = `
      import { createTaskRepository } from '@/domain/task/repository';
      import { createImportRepository } from '@/domain/import/repository';
    `;
    const errors = await lint('src/app/api/tasks/route.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('ignores relative imports within same domain', async () => {
    const code = `
      import { Task } from './types';
      import { toTask } from '../mapper';
    `;
    const errors = await lint('src/domain/task/repository.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('error message includes allowed imports', async () => {
    const code = `import { Handler } from '@/domain/handler/types';`;
    const errors = await lint('src/domain/task/repository.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Allowed domain imports: [step]');
  });

  test('hook can import from task (including state submodule)', async () => {
    const code = `import { StateEvent } from '@/domain/task/state/types';`;
    const errors = await lint('src/domain/hook/logic.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('task/state submodule is part of task domain', async () => {
    const code = `import { Task } from '@/domain/task/types';`;
    const errors = await lint('src/domain/task/state/service.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('task can import from step (including display-property submodule)', async () => {
    const code = `import { DisplayProperty } from '@/domain/step/display-property/types';`;
    const errors = await lint('src/domain/task/repository.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('step/display-property submodule is part of step domain', async () => {
    const code = `import { Step } from '@/domain/step/types';`;
    const errors = await lint('src/domain/step/display-property/repository.ts', code);
    expect(errors).toHaveLength(0);
  });

  test('fails closed for unknown domains', async () => {
    const code = `import { something } from '@/domain/task/types';`;
    const errors = await lint('src/domain/unknown-domain/file.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(
      "Domain 'unknown-domain' cannot import from domain 'task'"
    );
  });

  test('works with custom domain path configuration', async () => {
    const customConfig: DomainDependenciesConfig = {
      domainPath: 'packages/core/domains',
      importAlias: '~/domains',
      rootFiles: ['shared'],
      dependencies: {
        users: ['auth'],
        auth: []
      }
    };

    const linter = new Linter();
    await linter.init();
    linter.addRule(createDomainDependenciesRule(customConfig));

    const code = `import { User } from '~/domains/users/types';`;
    const errors = linter.lint('packages/core/domains/auth/service.ts', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(
      "Domain 'auth' cannot import from domain 'users'"
    );
  });

  test('works with different import alias prefix', async () => {
    const customConfig: DomainDependenciesConfig = {
      domainPath: 'src/modules',
      importAlias: '#modules',
      rootFiles: [],
      dependencies: {
        billing: ['users'],
        users: []
      }
    };

    const linter = new Linter();
    await linter.init();
    linter.addRule(createDomainDependenciesRule(customConfig));

    const allowedCode = `import { User } from '#modules/users/types';`;
    const allowedErrors = linter.lint('src/modules/billing/service.ts', allowedCode);
    expect(allowedErrors).toHaveLength(0);

    const blockedCode = `import { Invoice } from '#modules/billing/types';`;
    const blockedErrors = linter.lint('src/modules/users/service.ts', blockedCode);
    expect(blockedErrors).toHaveLength(1);
  });
});
