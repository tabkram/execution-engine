module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended'
  ],
  plugins: ['@typescript-eslint', 'simple-import-sort', 'prettier'],
  env: {
    node: true,
    jest: true
  },
  rules: {
    // indent: ["error", 2],
    'class-methods-use-this': 'off',
    'max-len': ['error', { ignoreComments: true, code: 140, ignorePattern: '^import .*' }],
    'no-await-in-loop': 'off',
    'no-continue': 'off',
    'no-extra-boolean-cast': 'off',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    // Imports sort
    'simple-import-sort/imports': 'error',
    // Unused vars
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn'],
    // No shadow
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    // Means error
    'prettier/prettier': 2,
    '@typescript-eslint/no-explicit-any': 'error'
  }
};
