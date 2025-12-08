import { describe, expect, test } from 'vitest';
import { Linter } from '../linter';
import { noDirectShadcnImportsRule } from './noDirectShadcnImports';

describe('noDirectShadcnImportsRule', () => {
  test('imports from shadcn in app code are flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `import { Button } from '@/shadcn/components/ui/button';`;

    const errors = linter.lint('src/app/page.tsx', code);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleName).toBe('no-direct-shadcn-imports');
    expect(errors[0].message).toContain('Direct imports from shadcn');
  });

  test('imports from shadcn in src/components are allowed', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `import { Button } from '@/shadcn/components/ui/button';`;

    const errors = linter.lint('src/components/ui/Button.tsx', code);
    expect(errors).toEqual([]);
  });

  test('imports from shadcn in nested components directory are allowed', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `import { Input } from '@/shadcn/components/ui/input';`;

    const errors = linter.lint('src/components/forms/TextField.tsx', code);
    expect(errors).toEqual([]);
  });

  test('non-shadcn imports are allowed anywhere', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `
      import { useState } from 'react';
      import { Button } from '@/components/ui';
    `;

    const errors = linter.lint('src/app/page.tsx', code);
    expect(errors).toEqual([]);
  });

  test('multiple shadcn imports are all flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `
      import { Button } from '@/shadcn/components/ui/button';
      import { Input } from '@/shadcn/components/ui/input';
    `;

    const errors = linter.lint('src/app/form.tsx', code);
    expect(errors).toHaveLength(2);
  });

  test('relative imports containing shadcn are flagged', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `import { Card } from '../../shadcn/components/ui/card';`;

    const errors = linter.lint('src/features/dashboard/page.tsx', code);
    expect(errors).toHaveLength(1);
  });

  test('error message explains the fix', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `import { Button } from '@/shadcn/components/ui/button';`;

    const errors = linter.lint('src/app/page.tsx', code);
    expect(errors[0].message).toContain('src/components/ui/');
    expect(errors[0].message).toContain('@/components/ui');
  });

  test('imports within shadcn directory are allowed', async () => {
    const linter = new Linter();
    await linter.init();
    linter.addRule(noDirectShadcnImportsRule);

    const code = `import { cn } from '@/shadcn/lib/utils';`;

    const errors = linter.lint('src/shadcn/components/ui/button.tsx', code);
    expect(errors).toEqual([]);
  });
});
