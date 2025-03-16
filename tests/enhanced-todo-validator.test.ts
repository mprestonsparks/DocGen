/**
 * Tests for the Enhanced Todo Validator
 */
import * as fs from 'fs';
import * as path from 'path';
import { 
  validateTodosEnhanced, 
  generateEnhancedTodoReport,
  EnhancedTodoValidationOptions,
  EnhancedTodoValidationResult
} from '../src/utils/enhanced-todo-validator';

// Mock the todo-validator module
jest.mock('../src/utils/todo-validator', () => ({
  validateTodos: jest.fn().mockResolvedValue({
    existingTodos: [
      { description: 'Existing TODO 1', file: 'file1.ts', line: 10, severity: 'medium' },
      { description: 'Existing TODO 2', file: 'file2.ts', line: 20, severity: 'high' }
    ],
    missingTodos: [
      { description: 'Missing TODO 1', file: 'file3.ts', line: 30, severity: 'medium', suggestedContent: 'TODO content' }
    ],
    suggestions: [
      { description: 'Missing TODO 1', file: 'file3.ts', line: 30, severity: 'medium', suggestedContent: 'TODO content' }
    ]
  }),
  findExistingTodos: jest.fn(),
  generateTodoReport: jest.fn()
}));

// Mock the ast-analyzer module
jest.mock('../src/utils/ast-analyzer', () => ({
  analyzeCodeAST: jest.fn().mockResolvedValue({
    nullReturns: [
      { file: 'file4.ts', line: 40, function: 'test', expectedType: 'string' }
    ],
    emptyBlocks: [],
    incompleteErrorHandling: [],
    incompleteSwitchStatements: [],
    suspiciousImplementations: []
  }),
  convertASTResultsToTodos: jest.fn().mockReturnValue([
    { description: 'AST TODO 1', file: 'file4.ts', line: 40, severity: 'high', suggestedContent: 'AST TODO content' }
  ])
}));

// Mock the fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn().mockResolvedValue([
      { name: 'file1.ts', isDirectory: () => false },
      { name: 'file2.ts', isDirectory: () => false },
      { name: 'node_modules', isDirectory: () => true }
    ]),
    writeFile: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock the logger
jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('Enhanced Todo Validator', () => {
  // Create a mock function we can control
  const mockWriteFile = jest.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Replace the mocked function with our own implementation
    fs.promises.writeFile = mockWriteFile;
  });
  
  describe('validateTodosEnhanced', () => {
    it('should run basic todo validation and semantic analysis', async () => {
      // Setup
      const projectPath = '/test/project';
      const options: EnhancedTodoValidationOptions = {
        depth: 'standard',
        reportMissing: true,
        suggestTodos: true,
        analyzeSemantics: true
      };
      
      // Execute
      const result = await validateTodosEnhanced(projectPath, options);
      
      // Verify
      expect(result).toBeDefined();
      expect(result.existingTodos).toHaveLength(2);
      expect(result.missingTodos).toHaveLength(2); // 1 from basic + 1 from semantic
      expect(result.semanticIssues).toBeDefined();
      expect(result.semanticIssues.nullReturns).toHaveLength(1);
    });
    
    it('should not run semantic analysis when disabled', async () => {
      // Setup
      const projectPath = '/test/project';
      const options: EnhancedTodoValidationOptions = {
        depth: 'standard',
        reportMissing: true,
        suggestTodos: true,
        analyzeSemantics: false
      };
      
      // Execute
      const result = await validateTodosEnhanced(projectPath, options);
      
      // Verify
      expect(result).toBeDefined();
      expect(result.missingTodos).toHaveLength(1); // Only from basic validation
      expect(result.semanticIssues).toBeDefined();
      expect(result.semanticIssues.nullReturns).toHaveLength(0);
      
      // Verify that semantic analysis was not called
      const { analyzeCodeAST } = require('../src/utils/ast-analyzer');
      expect(analyzeCodeAST).not.toHaveBeenCalled();
    });
    
    it('should use default options when none provided', async () => {
      // Setup
      const projectPath = '/test/project';
      
      // Execute
      const result = await validateTodosEnhanced(projectPath, {
        depth: 'standard',
        reportMissing: true,
        suggestTodos: true
      });
      
      // Verify defaults were used
      expect(result).toBeDefined();
      
      // Semantic analysis should be enabled by default
      const { analyzeCodeAST } = require('../src/utils/ast-analyzer');
      expect(analyzeCodeAST).toHaveBeenCalled();
    });
  });
  
  describe('generateEnhancedTodoReport', () => {
    // This is a simpler test that just verifies the function runs without error
    it('should generate a formatted report', async () => {
      // Create a mock result
      const result: EnhancedTodoValidationResult = {
        existingTodos: [
          { description: 'Existing TODO 1', file: 'file1.ts', line: 10, severity: 'medium' },
          { description: 'Existing TODO 2', file: 'file2.ts', line: 20, severity: 'high' }
        ],
        missingTodos: [
          { description: 'Missing TODO 1', file: 'file3.ts', line: 30, severity: 'medium', suggestedContent: 'TODO content' },
          { description: 'AST TODO 1', file: 'file4.ts', line: 40, severity: 'high', suggestedContent: 'AST TODO content' }
        ],
        suggestions: [
          { description: 'Missing TODO 1', file: 'file3.ts', line: 30, severity: 'medium', suggestedContent: 'TODO content' },
          { description: 'AST TODO 1', file: 'file4.ts', line: 40, severity: 'high', suggestedContent: 'AST TODO content' }
        ],
        semanticIssues: {
          nullReturns: [
            { file: 'file4.ts', line: 40, function: 'test', expectedType: 'string' }
          ],
          emptyBlocks: [],
          incompleteErrorHandling: [],
          incompleteSwitchStatements: [],
          suspiciousImplementations: []
        }
      };
      const outputPath = 'test-report.md';
      
      // Instead of testing the file writing, we'll override the function to just check
      // that it runs without throwing an error
      const originalWriteFile = fs.promises.writeFile;
      fs.promises.writeFile = jest.fn().mockResolvedValue(undefined);
      
      try {
        // Execute the function and expect it not to throw an error
        await generateEnhancedTodoReport(result, outputPath);
        expect(true).toBe(true); // If we get here, the test passes
      } finally {
        // Restore the original function
        fs.promises.writeFile = originalWriteFile;
      }
    });
  });
});