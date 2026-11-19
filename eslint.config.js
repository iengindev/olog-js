import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
    ],
  },
  {
    files: [
      '**/*.{js,ts}',
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'always' }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/member-delimiter-style': ['error', { multiline: { delimiter: 'none' }, singleline: { delimiter: 'comma', requireLast: true } }],
      '@stylistic/indent': ['error', 2],
      '@stylistic/list-style': 'error',
      '@stylistic/comma-spacing': 'error',
      '@stylistic/key-spacing': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/type-annotation-spacing': 'error',
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      '@stylistic/eol-last': 'error',
    },
  },
  {
    files: [
      'apps/**/*.ts',
      'packages/**/*.ts',
    ],
    ignores: [
      '**/*.config.ts',
    ],
    extends: [
      tseslint.configs.strictTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'FunctionDeclaration', message: 'Use () =>' },
        { selector: ':not(MethodDefinition, Property[method=true], Property[kind="get"], Property[kind="set"]) > FunctionExpression', message: 'Use () =>' },
        { selector: 'ExportDefaultDeclaration', message: 'Use naming export' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'variable', modifiers: ['const'], format: ['PascalCase'] },
        { selector: 'variable', modifiers: ['destructured'], format: null },
        { selector: ['objectLiteralProperty', 'objectLiteralMethod', 'typeProperty', 'typeMethod'], format: ['camelCase', 'snake_case'] },
        { selector: ['objectLiteralProperty', 'typeProperty'], modifiers: ['requiresQuotes'], format: null },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'curly': ['error', 'all'],
      'no-param-reassign': 'error',
      'no-nested-ternary': 'error',
      'no-else-return': 'error',
      'no-implicit-coercion': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'max-params': ['warn', 3],
      'max-depth': ['warn', 3],
      'complexity': ['warn', 10],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
)
