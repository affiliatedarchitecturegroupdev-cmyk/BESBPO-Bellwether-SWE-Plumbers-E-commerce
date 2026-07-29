const nextJest = require('next/jest');

// next/jest reads next.config.js and .babelrc automatically and applies
// Next's own SWC-based transform — this is Next.js's own official Jest
// integration, not a hand-rolled ts-jest/babel setup, specifically so
// this test setup behaves consistently with how the app actually builds
// (JSX, TypeScript, CSS Modules, image imports all handled the same way
// dev/build already handle them).
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Mirrors tsconfig.json's "@/*": ["./*"] — next/jest can often infer
  // this from tsconfig automatically, but declared explicitly here so
  // module resolution doesn't silently depend on that inference working.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: ['components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', '!**/*.d.ts'],
};

module.exports = createJestConfig(customJestConfig);
