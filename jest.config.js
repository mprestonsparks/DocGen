/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      isolatedModules: true, // Disables type-checking during tests
      tsconfig: "tsconfig.json"
    }],
  },
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      statements: 54, // Current: 54.07%, target: 80%
      branches: 38,   // Current: 38.1%, target: 60%
      functions: 61,  // Current: 61.64%, target: 70%
      lines: 53       // Current: 53.8%, target: 80%
    }
  },
  // Automatically mock certain problematic modules
  moduleNameMapper: {
    // Add module name mappings if needed
  },
  // Configure setup file for all tests
  setupFilesAfterEnv: ['<rootDir>/tests/jest-setup.js'],
  // Will be used by jest-setup.js
  globals: {
    // Global mocks and configuration
    SKIP_PROBLEMATIC_TESTS: true
  }
};