import type { Node } from 'web-tree-sitter';
import type { LintError, Rule } from '../types';

/**
 * Configuration for the no-primitive-obsession rule.
 *
 * Example config:
 * {
 *   "enforcedPaths": ["src/domain"],
 *   "exemptPaths": ["**\/mapper.ts", "**\/schema.ts"],
 *   "exemptParams": ["count", "index", "offset", "limit"],
 *   "primitives": ["string", "number", "boolean"]
 * }
 */
export type NoPrimitiveObsessionConfig = {
  /** Paths where the rule is enforced (e.g., ["src/domain"]) */
  enforcedPaths: string[];
  /** Glob patterns for files to exempt (e.g., ["**\/mapper.ts"]) */
  exemptPaths: string[];
  /** Parameter names to exempt (e.g., ["count", "index"]) */
  exemptParams: string[];
  /** Primitive types to flag (e.g., ["string", "number", "boolean"]) */
  primitives: string[];
};

const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'arrow_function',
  'method_definition'
];

/**
 * Creates a rule that flags primitive type annotations in the domain layer.
 *
 * Philosophy:
 * - Domain layer should use branded types (value objects) instead of primitives
 * - Primitives are fine in infrastructure layer (DB, API boundaries)
 * - This is a syntactic check only - can't verify brands are properly constructed
 */
export function createNoPrimitiveObsessionRule(
  config: NoPrimitiveObsessionConfig
): Rule {
  const { enforcedPaths, exemptPaths, exemptParams, primitives } = config;

  /**
   * Checks if a file path matches any of the enforced paths.
   */
  function isEnforcedPath(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return enforcedPaths.some(pattern => normalized.includes(pattern));
  }

  /**
   * Checks if a file path matches any exempt pattern.
   * Supports simple glob patterns like "**\/mapper.ts" or "schema.ts".
   */
  function isExemptPath(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');

    return exemptPaths.some(pattern => {
      if (pattern.startsWith('**/')) {
        // Match filename anywhere in path
        const filename = pattern.slice(3);
        return normalized.endsWith(filename);
      }
      // Direct substring match
      return normalized.includes(pattern);
    });
  }

  /**
   * Checks parameters of a function-like node for primitive type annotations.
   */
  function checkParameters(node: Node, filePath: string): LintError | null {
    // Get parameters node - arrow functions may use 'parameter' for single param
    const parametersNode =
      node.childForFieldName('parameters') || node.childForFieldName('parameter');

    if (!parametersNode) {
      return null;
    }

    // Handle single parameter (identifier node directly)
    if (parametersNode.type === 'identifier') {
      // Single param arrow without parens: x => x + 1
      // These don't have type annotations, skip
      return null;
    }

    // Iterate through parameters
    for (let i = 0; i < parametersNode.namedChildCount; i++) {
      const param = parametersNode.namedChild(i);
      if (!param) continue;

      // Skip rest parameters, destructuring patterns, etc.
      if (param.type !== 'required_parameter' && param.type !== 'optional_parameter') {
        continue;
      }

      const nameNode = param.childForFieldName('pattern');
      if (!nameNode) continue;

      const paramName = nameNode.text;

      // Skip exempt parameter names
      if (exemptParams.includes(paramName)) {
        continue;
      }

      const typeNode = param.childForFieldName('type');
      if (!typeNode) continue;

      // type_annotation contains the actual type as first named child
      const actualType = typeNode.namedChild(0);
      if (!actualType) continue;

      // Check if it's a predefined (primitive) type
      if (actualType.type === 'predefined_type') {
        const typeName = actualType.text;

        if (primitives.includes(typeName)) {
          const position = param.startPosition;
          const exemptList = exemptParams.length > 0 ? exemptParams.join(', ') : 'none';

          return {
            file: filePath,
            line: position.row + 1,
            column: position.column + 1,
            message:
              `Primitive type '${typeName}' used for parameter '${paramName}' in domain layer. ` +
              `Use a branded type (e.g., ${capitalize(paramName)}Id or ${capitalize(paramName)}) to avoid primitive obsession. ` +
              `Exempt params: [${exemptList}]. Configure in no-primitive-obsession.json.`,
            ruleName: 'no-primitive-obsession'
          };
        }
      }
    }

    return null;
  }

  return {
    name: 'no-primitive-obsession',
    check: (node: Node, filePath: string): LintError | null => {
      if (!FUNCTION_NODE_TYPES.includes(node.type)) {
        return null;
      }

      // Skip test files
      if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) {
        return null;
      }

      // Skip files not in enforced paths
      if (!isEnforcedPath(filePath)) {
        return null;
      }

      // Skip exempt files
      if (isExemptPath(filePath)) {
        return null;
      }

      return checkParameters(node, filePath);
    }
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
