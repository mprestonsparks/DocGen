export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Run both JavaScript and TypeScript tests
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'scripts/**/*.ts',
    'src/**/*.ts'
  ],
  coveragePathIgnorePatterns: [
    'node_modules/',
    'dist/',
    'src/types/'
  ],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 8,
      lines: 4,
      statements: 4
    }
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  }
};