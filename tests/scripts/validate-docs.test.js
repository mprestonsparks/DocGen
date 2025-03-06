/**
 * Tests for validate-docs.js script
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock modules
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn(path => path.split('/').pop())
}));
jest.mock('js-yaml');

// Import the script after mocking
const validateDocsPath = require.resolve('../../scripts/validate-docs');
let validateDocs;

describe('validate-docs.js', () => {
  // Mocks for console.log and process.exit
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  let consoleOutput = [];
  let exitCode;
  
  // Save original argv and restore later
  const originalArgv = process.argv;

  beforeAll(() => {
    // Mock console methods
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    
    // Mock process.exit
    process.exit = jest.fn(code => {
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
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readdirSync = jest.fn().mockReturnValue(['doc1.md', 'doc2.md']);
    fs.statSync = jest.fn().mockReturnValue({ isFile: () => true });
    fs.readFileSync = jest.fn().mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.2.3"
status: "DRAFT"
---

# Document Title`);
    
    // Mock yaml.load to parse YAML front matter
    yaml.load = jest.fn(content => {
      if (typeof content === 'string' && content.startsWith('---')) {
        return {
          documentType: "PRD",
          schemaVersion: "1.0.0",
          documentVersion: "1.2.3",
          status: "DRAFT"
        };
      }
      return {};
    });
    
    // Mock process.argv for each test
    process.argv = ['node', 'validate-docs.js'];
    
    // Since process.exit might be called, reload the module for each test
    jest.resetModules();
    validateDocs = require(validateDocsPath);
  });
  
  it('should exit if no doc files found', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue([]);
    
    // Execute & Verify
    expect(() => {
      validateDocs.validateDocumentation();
    }).toThrow('Process exited with code 1');
    
    expect(exitCode).toBe(1);
    expect(consoleOutput.join('\n')).toContain('No documentation files found');
  });
  
  it('should find document files correctly', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue(['doc1.md', 'doc2.md', 'not-a-doc.txt', 'subdir']);
    fs.statSync = jest.fn().mockImplementation((path) => ({
      isFile: () => !path.includes('subdir')
    }));
    
    // Execute
    const docFiles = validateDocs.getDocumentFiles();
    
    // Verify
    expect(docFiles).toHaveLength(2);
    expect(docFiles).toContain('docs/generated/doc1.md');
    expect(docFiles).toContain('docs/generated/doc2.md');
  });
  
  it('should validate a single document', () => {
    // Setup
    const docPath = 'docs/generated/doc1.md';
    
    // Execute
    const result = validateDocs.validateDocument(docPath);
    
    // Verify
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
  });
  
  it('should validate all documents', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue(['doc1.md', 'doc2.md']);
    
    // Execute
    const results = validateDocs.validateAllDocuments();
    
    // Verify
    expect(results).toHaveProperty('docs/generated/doc1.md');
    expect(results).toHaveProperty('docs/generated/doc2.md');
  });
  
  it('should handle file read errors gracefully', () => {
    // Setup
    fs.readFileSync = jest.fn().mockImplementation(() => {
      throw new Error('File read error');
    });
    
    // Execute
    const result = validateDocs.validateDocument('docs/generated/doc1.md');
    
    // Verify
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Error reading file');
  });
  
  it('should handle YAML parsing errors gracefully', () => {
    // Setup
    yaml.load = jest.fn().mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    
    // Execute
    const result = validateDocs.validateDocument('docs/generated/doc1.md');
    
    // Verify
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Error parsing YAML');
  });
  
  it('should validate document structure', () => {
    // Setup
    yaml.load = jest.fn().mockReturnValue({
      // Missing required fields
      documentType: "PRD",
      // schemaVersion: missing
      documentVersion: "1.2.3",
      // status: missing
    });
    
    // Execute
    const result = validateDocs.validateDocument('docs/generated/doc1.md');
    
    // Verify
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
  
  it('should validate document references', () => {
    // Setup - create document with references
    yaml.load = jest.fn().mockReturnValue({
      documentType: "PRD",
      schemaVersion: "1.0.0",
      documentVersion: "1.2.3",
      status: "DRAFT",
      references: [
        { id: "REF001", target: "SRS-001" },
        // Invalid reference with missing target
        { id: "REF002" }
      ]
    });
    
    // Execute
    const result = validateDocs.validateDocument('docs/generated/doc1.md');
    
    // Verify - should have a warning for the invalid reference
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  
  it('should check for required sections in document content', () => {
    // Setup
    fs.readFileSync = jest.fn().mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.2.3"
status: "DRAFT"
---

# Document Title

This document is missing required sections like Purpose, Scope, etc.`);
    
    // Execute
    const issues = validateDocs.findIssues(fs.readFileSync(), 'prd');
    
    // Verify
    expect(issues.warnings.length).toBeGreaterThan(0);
  });
  
  it('should display validation results', () => {
    // Mock validateDocument to return a validation result
    validateDocs.validateDocument = jest.fn().mockReturnValue({
      isValid: false,
      errors: [{ message: 'Error 1', code: 'E001' }],
      warnings: [{ message: 'Warning 1', code: 'W001' }]
    });
    
    // Execute
    validateDocs.displayValidationResult('docs/generated/doc1.md');
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Error 1');
    expect(consoleOutput.join('\n')).toContain('Warning 1');
  });
  
  it('should display all validation results', () => {
    // Mock validateAllDocuments to return validation results
    validateDocs.validateAllDocuments = jest.fn().mockReturnValue({
      'docs/generated/doc1.md': {
        isValid: true,
        errors: [],
        warnings: []
      },
      'docs/generated/doc2.md': {
        isValid: false,
        errors: [{ message: 'Error 1', code: 'E001' }],
        warnings: [{ message: 'Warning 1', code: 'W001' }]
      }
    });
    
    // Execute
    validateDocs.displayAllValidationResults();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('1/2 documents are valid');
    expect(consoleOutput.join('\n')).toContain('Error 1');
    expect(consoleOutput.join('\n')).toContain('Warning 1');
  });
  
  it('should display validation summary', () => {
    // Mock validateAllDocuments to return validation results
    validateDocs.validateAllDocuments = jest.fn().mockReturnValue({
      'docs/generated/doc1.md': {
        isValid: true,
        errors: [],
        warnings: []
      },
      'docs/generated/doc2.md': {
        isValid: false,
        errors: [{ message: 'Error 1', code: 'E001' }],
        warnings: [{ message: 'Warning 1', code: 'W001' }]
      }
    });
    
    // Execute
    validateDocs.displayValidationSummary();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Validation Summary');
    expect(consoleOutput.join('\n')).toContain('Total documents: 2');
    expect(consoleOutput.join('\n')).toContain('Valid documents: 1');
    expect(consoleOutput.join('\n')).toContain('Total errors: 1');
    expect(consoleOutput.join('\n')).toContain('Total warnings: 1');
  });
  
  it('should execute main function', () => {
    // Setup
    process.argv = ['node', 'validate-docs.js', '--file=docs/generated/doc1.md'];
    jest.resetModules();
    validateDocs = require(validateDocsPath);
    
    // Mock validateDocument
    validateDocs.validateDocument = jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    // Mock displayValidationResult
    validateDocs.displayValidationResult = jest.fn();
    
    // Execute
    validateDocs.main();
    
    // Verify
    expect(validateDocs.validateDocument).toHaveBeenCalledWith('docs/generated/doc1.md');
    expect(validateDocs.displayValidationResult).toHaveBeenCalled();
  });
});