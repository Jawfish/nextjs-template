import type { Node } from 'web-tree-sitter';

export type LintError = {
  file: string;
  line: number;
  column: number;
  message: string;
  ruleName: string;
};

export type Rule = {
  name: string;
  check: (node: Node, filePath: string) => LintError | null;
};
