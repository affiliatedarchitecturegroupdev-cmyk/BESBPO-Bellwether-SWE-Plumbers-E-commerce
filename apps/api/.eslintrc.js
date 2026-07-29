module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // NestJS/Prisma patterns throughout this codebase rely on decorators
    // and DI-injected classes that legitimately have no explicit return
    // type declared at every call site — this codebase's own DTOs and
    // services already lean on inferred types elsewhere, so this stays
    // off rather than fighting the existing style wholesale.
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
};
