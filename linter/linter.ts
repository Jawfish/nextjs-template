import { join } from 'node:path';
import { Language, type Node, Parser, type Tree } from 'web-tree-sitter';
import type { LintError, Rule } from './types';

export class Linter {
  private rules: Rule[] = [];
  private parser: Parser | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    await Parser.init();
    this.parser = new Parser();

    const grammarPath = join(__dirname, 'grammars', 'tree-sitter-typescript.wasm');
    const language = await Language.load(grammarPath);

    this.parser.setLanguage(language);
    this.initialized = true;
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  lint(filePath: string, sourceCode: string): LintError[] {
    if (!this.parser) {
      throw new Error('Linter not initialized. Call init() first.');
    }

    const tree = this.parser.parse(sourceCode) as Tree;
    const errors: LintError[] = [];

    const traverse = (node: Node) => {
      for (const rule of this.rules) {
        const error = rule.check(node, filePath);
        if (error) {
          errors.push(error);
        }
      }

      for (const child of node.children) {
        traverse(child as Node);
      }
    };

    traverse(tree.rootNode);
    return errors;
  }
}
