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
  collectCoverage: false,
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