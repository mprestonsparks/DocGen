module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es6: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    // Allow unused variables when they begin with underscore
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    // Temporarily relax some rules for easier development
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // Enforce consistent spacing
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }]
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage'
  ]
};
