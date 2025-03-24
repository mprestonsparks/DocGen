# DocGen Test Suite

This directory contains test files for the DocGen project.

## Recent Improvements

1. **TypeScript Conversion**: 
   - Converted JavaScript test files to TypeScript for better type safety
   - Fixed index-coverage.test.js → index-coverage.test.ts
   - Fixed scripts-coverage.test.js → scripts-coverage.test.ts

2. **Module Mocking Improvements**:
   - Updated mock implementations to use TypeScript-compatible patterns
   - Added proper type assertions to mocked functions
   - Fixed issues with circular dependencies in mocks

3. **Test Coverage Expansion**:
   - Added tests for validation.ts module
   - Added more test cases for the logger.ts module
   - Added more test cases for the llm.ts module
   - Added more test cases for the session.ts module
   - **NEW**: Added tests for src/index.ts exported functions

4. **Mock Patterns**:
   - Standardized mock patterns across the test suite
   - Fixed ES module compatibility issues with mocking
   - Improved mock cleanup between tests
   - **NEW**: Added patterns for mocking CLI tools like Commander

## Testing Guidelines

1. **TypeScript Tests**: All tests should be written in TypeScript for type safety and improved code quality.

2. **Module Mocking**: Use proper TypeScript-compatible mocking patterns:
   - Use `jest.mock()` with `jest.requireActual()` when needed to preserve module exports
   - Use type casting with `as jest.Mock` for mocked functions
   - Set up proper return types for mocked functions

3. **Test Organization**:
   - Group related tests using `describe` blocks
   - Use clear and descriptive test names
   - Set up test fixtures in `beforeEach` blocks when possible

4. **Avoiding Test Interdependence**:
   - Reset mocks between tests with `jest.clearAllMocks()`
   - Create separate test fixtures for each test

## Mock Patterns

### Mocking File System Functions

```typescript
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Usage in tests
(fs.existsSync as jest.Mock).mockReturnValue(true);
(fs.readFileSync as jest.Mock).mockReturnValue('file content');
```

### Mocking Dependencies

```typescript
// With direct access to mock functions
const mockError = jest.fn();
jest.mock('../src/utils/logger', () => ({
  error: mockError,
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

// Usage
expect(mockError).toHaveBeenCalled();
```

### Mocking Package Modules

```typescript
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ answer: 'Mock response' })
}));
```

### Mocking CLI Tools (Commander)

```typescript
// Mock commander to prevent it from parsing arguments
jest.mock('commander', () => ({
  program: {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn(), // Mock parse to do nothing
    outputHelp: jest.fn()
  }
}));
```

## Testing CLI Entry Points

Testing `src/index.ts` requires special handling since it contains Commander CLI setup that tries to parse process.argv and exit:

1. **Test Import Order Matters**: Mock dependencies before importing the module
   ```typescript
   // Mock dependencies first
   jest.mock('commander', () => ({ ... }));
   
   // Then import the module
   import { exportedFunction } from '../src/index';
   ```

2. **Testing Exported Functions**: Test exported functions independently
   - `src-index.complete.test.ts`: Tests for validateSchemaVersionCompatibility
   - `load-project-defaults.test.ts`: Tests for loadProjectDefaults

## Running Tests

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- tests/file-name.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Test Status

- Test Coverage: Currently at ~45%, focus on increasing coverage in validation.ts
- Migration Status: All test files using TypeScript with improved patterns
- CLI Testing: Using specialized mocking techniques for CLI entry points

## Future Improvements

To improve test coverage further:
1. Create more focused tests for validation.ts
2. Consider using mock-fs for more realistic file system testing
3. Add more integration tests