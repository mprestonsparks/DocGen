// This file is automatically loaded by Jest in every test
// It's used to set up any global mocks or configurations

// Skip certain tests that might be problematic
if (global.SKIP_PROBLEMATIC_TESTS) {
  // This will mark tests as skipped based on filename or test name
  const originalDescribe = global.describe;
  
  // Override the global describe function to conditionally skip tests
  global.describe = (name, fn) => {
    // We've fixed the Project Analyzer tests, so let them run
    if (name === 'BROKEN_TEST_EXAMPLE') {
      // If we have failing tests, conditionally mark as skipped
      originalDescribe.skip(name, fn);
    } else {
      // Otherwise run the test as normal
      originalDescribe(name, fn);
    }
  };
}

// Mock getLogger function globally to prevent errors
jest.mock('../src/utils/logger', () => {
  const originalModule = jest.requireActual('../src/utils/logger');
  
  return {
    ...originalModule,
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn()
    }))
  };
});