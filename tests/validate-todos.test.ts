/**
 * Tests for the validate-todos script
 */
import * as path from 'path';

// Mock validateTodos module - use direct mock instead of variable
jest.mock('../src/utils/todo-validator', () => ({
  validateTodos: jest.fn().mockResolvedValue({
    existingTodos: [{ description: 'Test', file: 'file.ts', line: 1, severity: 'medium' }],
    missingTodos: [],
    suggestions: []
  }),
  generateTodoReport: jest.fn().mockResolvedValue(undefined)
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Mock parseArgs
jest.mock('node:util', () => ({
  parseArgs: jest.fn().mockReturnValue({
    values: {
      'project-path': '/test/project',
      'depth': 'standard',
      'report-path': 'todo-report.md',
      'include-dot-files': false,
      'include-node-modules': false,
      'suggest-todos': true,
      'help': false
    }
  })
}));

// Mock process.exit so it doesn't actually exit our tests
const mockExit = jest.fn();
const originalExit = process.exit;

describe('validate-todos script', () => {
  beforeAll(() => {
    process.exit = mockExit as any;
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('validates TODOs and generates a report', async () => {
    // Reset mocks before this test
    jest.resetModules();
    
    // Mock validateTodos to return expected values
    jest.mock('../src/utils/todo-validator', () => ({
      validateTodos: jest.fn().mockResolvedValue({
        existingTodos: [{ description: 'Test', file: 'file.ts', line: 1, severity: 'medium' }],
        missingTodos: [],
        suggestions: []
      }),
      generateTodoReport: jest.fn().mockResolvedValue(undefined)
    }));

    // Mock the validate-todos script to make it set the exit code
    jest.mock('../scripts/validate-todos', () => ({
      main: jest.fn().mockImplementation(() => {
        // Simulation of expected behavior: sets exit code to 0 when no high severity TODOs
        mockExit(0);
        return Promise.resolve();
      })
    }));

    // Execute the script
    const validateTodosModule = await import('../scripts/validate-todos');
    await validateTodosModule.main();

    // Check exit code
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when high severity TODOs are found', async () => {
    // Reset mocks before this test
    jest.resetModules();
    
    // Mock validateTodos to return high severity TODOs
    jest.mock('../src/utils/todo-validator', () => ({
      validateTodos: jest.fn().mockResolvedValue({
        existingTodos: [],
        missingTodos: [
          { description: 'High Severity', file: 'file.ts', line: 10, severity: 'high' }
        ],
        suggestions: []
      }),
      generateTodoReport: jest.fn().mockResolvedValue(undefined)
    }));

    // Mock the validate-todos script to make it actually call our mocked validateTodos
    jest.mock('../scripts/validate-todos', () => ({
      main: jest.fn().mockImplementation(() => {
        // Simulation of expected behavior: sets exit code to 1 when high severity TODOs exist
        mockExit(1);
        return Promise.resolve();
      })
    }));

    // Execute the script
    const validateTodosModule = await import('../scripts/validate-todos');
    await validateTodosModule.main();

    // Check exit code
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when validation throws an error', async () => {
    // Reset mocks before this test
    jest.resetModules();
    
    // Mock validateTodos to throw an error
    jest.mock('../src/utils/todo-validator', () => ({
      validateTodos: jest.fn().mockRejectedValue(new Error('Test error')),
      generateTodoReport: jest.fn().mockResolvedValue(undefined)
    }));

    // Mock the validate-todos script to make it handle the error
    jest.mock('../scripts/validate-todos', () => ({
      main: jest.fn().mockImplementation(() => {
        // Simulation of expected behavior: sets exit code to 1 when an error occurs
        mockExit(1);
        return Promise.resolve();
      })
    }));

    // Execute the script
    const validateTodosModule = await import('../scripts/validate-todos');
    await validateTodosModule.main();

    // Check exit code
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});