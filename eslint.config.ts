import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      // No suppressed errors (CLAUDE.md quality bar).
      '@typescript-eslint/ban-ts-comment': ['error', { minimumDescriptionLength: 1000 }],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      eqeqeq: 'error',
      'no-console': 'error',
      // Determinism: same seed = same output, so only the seeded PRNG from the core.
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded PRNG from the core.' },
        { object: 'Date', property: 'now', message: 'Pass the reference date explicitly.' },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { jsdoc },
    rules: {
      // No network access at runtime; the library is also platform neutral.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^node:', message: 'src/ must not depend on Node.js built-ins.' },
            { regex: '/cli(\\.js)?$', message: 'The library must never load the CLI.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'No network access at runtime.' },
        { name: 'XMLHttpRequest', message: 'No network access at runtime.' },
        { name: 'WebSocket', message: 'No network access at runtime.' },
      ],
      // Public API is documented with TSDoc.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ClassDeclaration: true },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'VariableDeclaration'],
        },
      ],
      'jsdoc/check-tag-names': ['error', { typed: true }],
      'jsdoc/no-types': 'error',
    },
  },
  {
    // The CLI is a separate Node.js entry point; node:util parseArgs is its only "dependency".
    files: ['src/cli.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '^node:(?!util$)', message: 'The CLI uses only node:util (parseArgs).' }] },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // describe() blocks in specification-style tests are naturally long.
      'max-lines-per-function': 'off',
    },
  },
);
