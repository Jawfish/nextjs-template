import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

const ERROR_MESSAGE = `
Direct imports from shadcn components are not allowed outside of src/components/.

Always wrap shadcn/ui components in src/components/ui/ and import from there instead.
This provides a single point of customization and decouples app code from the component library.

Example:
  // Bad: Direct import from shadcn
  import { Button } from '@/shadcn/components/ui/button';

  // Good: Import from wrapper
  import { Button } from '@/components/ui';
`.trim();

function isShadcnImport(source: string): boolean {
  return source.includes('shadcn') || source.includes('/shadcn/');
}

function isAllowedToImportShadcn(filePath: string): boolean {
  return (
    filePath.includes('src/components/') ||
    filePath.includes('src\\components\\') ||
    filePath.includes('src/shadcn/') ||
    filePath.includes('src\\shadcn\\')
  );
}

export const noDirectShadcnImportsRule: Rule = {
  name: 'no-direct-shadcn-imports',
  check: (node: Node, filePath: string): LintError | null => {
    if (node.type !== 'import_statement') {
      return null;
    }

    const sourceNode = node.childForFieldName('source');
    if (!sourceNode) {
      return null;
    }

    const source = sourceNode.text.replace(/['"]/g, '');

    if (isShadcnImport(source) && !isAllowedToImportShadcn(filePath)) {
      const position = node.startPosition;
      return {
        file: filePath,
        line: position.row + 1,
        column: position.column + 1,
        message: ERROR_MESSAGE,
        ruleName: 'no-direct-shadcn-imports'
      };
    }

    return null;
  }
};
