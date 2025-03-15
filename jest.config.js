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
      statements: 69, // Current: 68.66%, target: 80%
      branches: 47,   // Current: 47.17%, target: 60%
      functions: 70,  // Current: 70.16%, target: 70% - Met!
      lines: 69       // Current: 68.67%, target: 80%
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