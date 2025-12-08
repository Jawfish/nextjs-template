import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

/**
 * Configuration for domain dependency checking.
 *
 * Example config:
 * {
 *   "domainPath": "src/lib/domain",
 *   "importAlias": "@/lib/domain",
 *   "rootFiles": ["cache"],
 *   "dependencies": {
 *     "task": ["step"],
 *     "hook": ["task"],
 *     "integration": ["*"]
 *   }
 * }
 */
export type DomainDependenciesConfig = {
  /** Path to domain directory from repo root (e.g., "src/lib/domain") */
  domainPath: string;
  /** Import alias for domain directory (e.g., "@/lib/domain") */
  importAlias: string;
  /** Files at domain root that are not domains themselves */
  rootFiles: string[];
  /** Map of domain names to allowed dependencies. Use ["*"] for wildcard. */
  dependencies: Record<string, string[]>;
};

/**
 * Creates a domain dependencies rule with the given configuration.
 *
 * Philosophy:
 * - Core domains should have minimal or no cross-domain dependencies
 * - Supporting domains can depend on core domains they produce/consume
 * - No circular dependencies between domains
 * - Dependency direction: supporting -> core, never core -> supporting
 */
export function createDomainDependenciesRule(config: DomainDependenciesConfig): Rule {
  const { domainPath, importAlias, rootFiles, dependencies } = config;

  // Convert domainPath to regex pattern (handles both forward and back slashes)
  const domainPathPattern = domainPath.replace(/\//g, '\\/');
  const domainPathRegex = new RegExp(`${domainPathPattern}\\/([^/]+)`);

  // Convert importAlias to regex pattern
  const importAliasPattern = importAlias.replace(/[/@]/g, '\\$&');
  const importAliasRegex = new RegExp(`${importAliasPattern}\\/([^/]+)`);

  /**
   * Extracts domain name from a file path.
   * Returns null if the file is not in a domain.
   */
  function getDomainFromPath(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');
    const match = normalized.match(domainPathRegex);
    return match ? match[1] : null;
  }

  /**
   * Extracts domain name from an import source.
   * Returns null if the import is not from a domain.
   */
  function getDomainFromImport(importSource: string): string | null {
    if (!importSource.startsWith(importAlias.split('/')[0])) {
      return null;
    }

    const match = importSource.match(importAliasRegex);
    if (!match) {
      return null;
    }

    const domain = match[1];

    if (rootFiles.includes(domain)) {
      return null;
    }

    return domain;
  }

  /**
   * Checks if a domain import is allowed.
   */
  function isImportAllowed(fromDomain: string, toDomain: string): boolean {
    if (fromDomain === toDomain) {
      return true;
    }

    const allowed = dependencies[fromDomain];

    if (!allowed) {
      return false;
    }

    if (allowed.includes('*')) {
      return true;
    }

    return allowed.includes(toDomain);
  }

  return {
    name: 'domain-dependencies',
    check: (node: Node, filePath: string): LintError | null => {
      if (node.type !== 'import_statement') {
        return null;
      }

      if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) {
        return null;
      }

      const fromDomain = getDomainFromPath(filePath);
      if (!fromDomain) {
        return null;
      }

      const sourceNode = node.childForFieldName('source');
      if (!sourceNode) {
        return null;
      }

      const importSource = sourceNode.text.replace(/['"]/g, '');

      const toDomain = getDomainFromImport(importSource);
      if (!toDomain) {
        return null;
      }

      if (!isImportAllowed(fromDomain, toDomain)) {
        const position = node.startPosition;
        const allowed = dependencies[fromDomain] || [];
        const allowedList = allowed.length > 0 ? allowed.join(', ') : 'none';

        return {
          file: filePath,
          line: position.row + 1,
          column: position.column + 1,
          message: `Domain '${fromDomain}' cannot import from domain '${toDomain}'. Allowed domain imports: [${allowedList}]`,
          ruleName: 'domain-dependencies'
        };
      }

      return null;
    }
  };
}
