import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from "eslint-plugin-import";
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ignored files
  {
    ignores: [
      '**/.*',
      '**/coverage/**',
      '**/dist/**',
      '**/mocks/**',
      '**/node_modules/**',
      '**/jest.setup.js',
      'build-dev-env/'
    ]
  },
  // check-file
  {
    plugins: {
      'check-file': checkFile
    },
    rules: {
      'check-file/filename-blocklist': [
        'error',
        {
          '**/*.test.ts': '*.spec.ts',
          '**/*.models.ts': '*.model.ts',
          '**/*.domain.ts': '*.enum.ts',
          '**/*.enums.ts': '*.enum.ts',
          '**/*.helpers.ts': '*.helper.ts'
        }
      ],
      'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE', 'sc/**/': 'KEBAB_CASE' }]
    },
  },
  // typescript
  {
    files: ['**/*.ts', '**/*.js'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended
    ],
    rules: {
      // 'no-console': 'warn',
      curly: 'error',
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          allowSeparatedGroups: false
        }
      ],
      '@typescript-eslint/no-unused-vars': ['error', { vars: 'all', args: 'none', ignoreRestSiblings: false }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['PascalCase'], selector: ['class'] },
        { format: ['camelCase'], selector: ['classMethod', 'classProperty'], leadingUnderscore: 'allow' }
      ]
    }
  },
  // stylistic
  {
    files: ['**/*.ts', '**/*.js'],
    // extends: [
    //   stylistic.configs['recommended-flat']
    // ],
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single', { 'avoidEscape': true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      // '@stylistic/no-extra-parens': ["error", "all"],
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { 'max': 3, 'maxEOF': 0 }],
      '@stylistic/max-len': [
        'error',
        {
          code: 160,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignorePattern: '^import .*'
        }
      ],
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/operator-linebreak': ['error', 'after', { 'overrides': { '?': 'before', ':': 'before' } }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      // '@stylistic/function-paren-newline':  ["error", "multiline"],
      '@stylistic/brace-style': 'error'
    }
  },
  // import
  {
    files: ['**/*.ts'],
    extends: [
      importPlugin.flatConfigs.recommended
    ],
    rules: {
      'import/no-unresolved': 'off',
      'import/namespace': ['error', { 'allowComputed': true }],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown'
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ]
    }
  },
  {
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'error'
    }
  }
);
