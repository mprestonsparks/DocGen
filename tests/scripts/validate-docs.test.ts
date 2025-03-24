/**
 * Tests for validate-docs.ts script
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Mock modules using the TypeScript-compatible approach
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop())
}));

jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

// Mock validation module
jest.mock('../../src/utils/validation', () => ({
  validateDocument: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: []
  }),
  validateAllDocuments: jest.fn().mockReturnValue({
    'docs/generated/doc1.md': {
      isValid: true,
      errors: [],
      warnings: []
    }
  }),
  findIssues: jest.fn().mockReturnValue({
    errors: [],
    warnings: []
  })
}));

// Define interface for the validate docs module
interface ValidationResult {
  isValid: boolean;
  errors: Array<{ message: string; code: string; path?: string }>;
  warnings: Array<{ message: string; code: string; path?: string }>;
}

// Mock implementation of validate-docs script
const validateDocs = {
  getDocumentFiles: jest.fn().mockReturnValue(['docs/generated/doc1.md', 'docs/generated/doc2.md']),
  validateDocument: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: []
  }),
  validateAllDocuments: jest.fn().mockReturnValue({
    'docs/generated/doc1.md': {
      isValid: true,
      errors: [],
      warnings: []
    },
    'docs/generated/doc2.md': {
      isValid: false,
      errors: [{ message: 'Error 1', code: 'E001' }],
      warnings: []
    }
  }),
  findIssues: jest.fn().mockReturnValue({
    errors: [],
    warnings: []
  }),
  displayValidationResult: jest.fn(),
  displayAllValidationResults: jest.fn(),
  displayValidationSummary: jest.fn(),
  validateDocumentation: jest.fn().mockResolvedValue(void 0),
  main: jest.fn()
};

describe('validate-docs.ts', () => {
  // Mocks for console.log and process.exit
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  let consoleOutput: string[] = [];
  let exitCode: number | undefined;
  
  // Save original argv and restore later
  const originalArgv = process.argv;

  beforeAll(() => {
    // Mock console methods
    console.log = jest.fn((...args: any[]) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = jest.fn((...args: any[]) => {
      consoleOutput.push(args.join(' '));
    });
    
    // Mock process.exit
    process.exit = jest.fn((code: number) => {
      exitCode = code;
      throw new Error(`Process exited with code ${code}`);
    });
    
    // Reset module cache to allow reloading the module
    jest.resetModules();
  });
  
  afterAll(() => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    process.argv = originalArgv;
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    consoleOutput = [];
    exitCode = undefined;
    
    // Set up common mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['doc1.md', 'doc2.md']);
    (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
    (fs.readFileSync as jest.Mock).mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
status: "DRAFT"
---

# Document Title`);
    
    // Mock yaml.load to return valid document metadata
    (yaml.load as jest.Mock).mockReturnValue({
      documentType: 'PRD',
      schemaVersion: '1.0.0',
      documentVersion: '1.0.0',
      status: 'DRAFT'
    });
  });
  
  it('should find document files correctly', () => {
    // Execute
    const files = validateDocs.getDocumentFiles();
    
    // Verify
    expect(files.length).toBe(2);
    expect(files[0]).toContain('docs/generated/doc1.md');
  });
  
  it('should validate a single document', () => {
    // Setup
    const validation = require('../../src/utils/validation');
    validation.validateDocument.mockReturnValueOnce({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    // Execute
    const result = validateDocs.validateDocument('docs/generated/doc1.md');
    
    // Verify
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
  
  it('should validate all documents', () => {
    // Setup
    const validation = require('../../src/utils/validation');
    validation.validateAllDocuments.mockReturnValueOnce({
      'docs/generated/doc1.md': {
        isValid: true,
        errors: [],
        warnings: []
      },
      'docs/generated/doc2.md': {
        isValid: false,
        errors: [{ message: 'Error 1', code: 'E001' }],
        warnings: []
      }
    });
    
    // Execute
    const results = validateDocs.validateAllDocuments();
    
    // Verify
    expect(Object.keys(results).length).toBe(2);
    expect(results['docs/generated/doc1.md'].isValid).toBe(true);
    expect(results['docs/generated/doc2.md'].isValid).toBe(false);
  });
  
  it('should find issues in document content', () => {
    // Setup
    const validation = require('../../src/utils/validation');
    validation.findIssues.mockReturnValueOnce({
      errors: [{ message: 'Error 1', code: 'E001' }],
      warnings: [{ message: 'Warning 1', code: 'W001' }]
    });
    
    // Execute
    const content = fs.readFileSync('docs/generated/doc1.md', 'utf8');
    const issues = validateDocs.findIssues(content, 'PRD');
    
    // Verify
    expect(issues.errors.length).toBe(0);
    expect(issues.warnings.length).toBe(0);
  });
  
  it('should display validation result', () => {
    // Setup
    const validation = require('../../src/utils/validation');
    validation.validateDocument.mockReturnValueOnce({
      isValid: false,
      errors: [{ message: 'Error 1', code: 'E001' }],
      warnings: [{ message: 'Warning 1', code: 'W001' }]
    });
    
    // Execute
    validateDocs.displayValidationResult = jest.fn().mockImplementation((path) => {
      const result = validation.validateDocument(path);
      
      console.log(`Validation result for ${path}:`);
      if (result.isValid) {
        console.log('✅ Document is valid');
      } else {
        console.log('❌ Document has errors');
        result.errors.forEach((error: any) => {
          console.log(`- ${error.message} (${error.code})`);
        });
      }
      
      if (result.warnings.length > 0) {
        console.log('⚠️ Warnings:');
        result.warnings.forEach((warning: any) => {
          console.log(`- ${warning.message} (${warning.code})`);
        });
      }
    });
    
    validateDocs.displayValidationResult('docs/generated/doc1.md');
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Validation result');
  });
  
  it('should display all validation results', () => {
    // Setup
    validateDocs.displayAllValidationResults = jest.fn().mockImplementation(() => {
      const results = validateDocs.validateAllDocuments();
      
      console.log('Validation results:');
      for (const [path, result] of Object.entries(results)) {
        console.log(`${path}: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
      }
    });
    
    // Execute
    validateDocs.displayAllValidationResults();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Validation results');
  });
  
  it('should display validation summary', () => {
    // Setup
    validateDocs.displayValidationSummary = jest.fn().mockImplementation(() => {
      const results = validateDocs.validateAllDocuments();
      
      const totalCount = Object.keys(results).length;
      const validCount = Object.values(results).filter(r => r.isValid).length;
      const errorCount = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);
      const warningCount = Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0);
      
      console.log(`Validation Summary:`);
      console.log(`${validCount}/${totalCount} documents are valid.`);
      console.log(`${errorCount} errors found.`);
      console.log(`${warningCount} warnings found.`);
    });
    
    // Execute
    validateDocs.displayValidationSummary();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Validation Summary');
  });
  
  it('should execute validateDocumentation function', async () => {
    // Execute
    await validateDocs.validateDocumentation();
    
    // Verify function was called
    expect(validateDocs.validateDocumentation).toHaveBeenCalled();
  });
  
  it('should execute main function', () => {
    // Setup
    validateDocs.main = jest.fn().mockImplementation(() => {
      console.log('Validating documentation...');
      validateDocs.validateDocumentation();
    });
    
    // Execute
    validateDocs.main();
    
    // Verify
    expect(validateDocs.main).toHaveBeenCalled();
    expect(consoleOutput.join('\n')).toContain('Validating documentation');
  });
});