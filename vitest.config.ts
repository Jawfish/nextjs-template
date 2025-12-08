import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'linter/**/*.ts'],
      exclude: [
        'src/**/*.tsx',
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/shadcn/**',
        'src/**/types.ts',
        'src/**/index.ts',
        'linter/**/*.test.ts',
        'linter/cli.ts',
        'linter/types.ts',
        'linter/index.ts'
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    }
  }
});
