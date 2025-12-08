#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { formatErrors } from './formatter';
import { Linter } from './linter';
import {
  createDomainDependenciesRule,
  type DomainDependenciesConfig
} from './rules/domainDependencies';
import { noDirectShadcnImportsRule } from './rules/noDirectShadcnImports';
import { noInteractionAssertionsRule } from './rules/noInteractionAssertions';
import { noMisleadingTestDoubleNamesRule } from './rules/noMisleadingTestDoubleNames';
import { noSpyOnRule } from './rules/noSpyOn';
import { noTestNameWithMethodNamesRule } from './rules/noTestNameWithMethodNames';
import { noTestNameWithShouldRule } from './rules/noTestNameWithShould';
import { noViFnRule } from './rules/noViFn';
import { noViMockRule } from './rules/noViMock';
import { noViMockedRule } from './rules/noViMocked';
import { noViStubRule } from './rules/noViStub';

const CONFIG_FILE = 'domain-dependencies.json';

function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadDomainConfig(): DomainDependenciesConfig | null {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }

  const content = readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(content) as DomainDependenciesConfig;
}

async function main() {
  const targetDir = process.argv[2] || 'src';

  const linter = new Linter();
  await linter.init();

  const domainConfig = loadDomainConfig();
  if (domainConfig) {
    linter.addRule(createDomainDependenciesRule(domainConfig));
  }

  linter.addRule(noDirectShadcnImportsRule);
  linter.addRule(noSpyOnRule);
  linter.addRule(noViFnRule);
  linter.addRule(noViMockRule);
  linter.addRule(noViMockedRule);
  linter.addRule(noViStubRule);
  linter.addRule(noInteractionAssertionsRule);
  linter.addRule(noMisleadingTestDoubleNamesRule);
  linter.addRule(noTestNameWithMethodNamesRule);
  linter.addRule(noTestNameWithShouldRule);

  const files = findTsFiles(targetDir);
  let totalErrors = 0;

  for (const file of files) {
    const source = readFileSync(file, 'utf-8');
    const errors = linter.lint(file, source);

    if (errors.length > 0) {
      console.error(formatErrors(errors));
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) {
    console.error(
      `\nFound ${totalErrors} linting error${totalErrors === 1 ? '' : 's'}`
    );
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Linter failed:', err);
  process.exit(1);
});
