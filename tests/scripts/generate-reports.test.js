/**
 * Tests for generate-reports.js script
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

// Mock modules
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn(path => path.split('/').pop())
}));
jest.mock('js-yaml');
jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue('mocked exec output')
}));

// Import the script after mocking
const generateReportsPath = require.resolve('../../scripts/generate-reports');
let generateReports;

describe('generate-reports.js', () => {
  // Mocks for console.log and process.exit
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  let consoleOutput = [];
  let exitCode;

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
      // This line allows the process.exit call to be caught properly by Jest
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
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    consoleOutput = [];
    exitCode = undefined;
    
    // Set up mocks for getDocumentFiles to return files
    fs.readdirSync = jest.fn().mockReturnValue(['file1.md', 'file2.md']);
    fs.statSync = jest.fn().mockReturnValue({ isFile: () => true });
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();
    fs.readFileSync = jest.fn().mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
status: "DRAFT"
---

# Document Title`);
    
    // Since process.exit will throw, we need to reload the module for each test
    jest.resetModules();
    generateReports = require(generateReportsPath);
  });
  
  it('should exit with code 1 if no doc files found', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue([]);
    
    // Execute & Verify
    expect(() => {
      generateReports.generateReports();
    }).toThrow('Process exited with code 1');
    
    expect(exitCode).toBe(1);
    expect(consoleOutput.join('\n')).toContain('No documentation files found');
  });
  
  it('should create reports directory if it does not exist', () => {
    // Setup
    fs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
    
    // Execute
    expect(() => {
      generateReports.generateReports();
    }).not.toThrow();
    
    // Verify
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.mkdirSync.mock.calls[0][0]).toContain('reports');
  });
  
  it('should generate summary report with proper data', () => {
    // Setup
    const mockValidationResults = {
      'file1.md': { isValid: true, errors: [], warnings: [] },
      'file2.md': { isValid: false, errors: [{ message: 'Error 1', code: 'E001' }], warnings: [] }
    };
    
    // Mock validation function to return results
    generateReports.validateAllDocuments = jest.fn().mockReturnValue(mockValidationResults);
    
    // Execute
    try {
      generateReports.generateReports();
    } catch (e) {
      // Ignore process.exit error
    }
    
    // Verify
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.writeFileSync.mock.calls[0][1]).toContain('validation-summary.md');
  });
  
  it('should parse validation results correctly', () => {
    // Setup
    const mockValidationResults = {
      'file1.md': { isValid: true, errors: [], warnings: [] },
      'file2.md': { isValid: false, errors: [{ message: 'Error 1', code: 'E001' }], warnings: [{ message: 'Warning 1', code: 'W001' }] }
    };
    
    // Execute
    const stats = generateReports.parseValidationResults(mockValidationResults);
    
    // Verify
    expect(stats.totalFiles).toBe(2);
    expect(stats.validFiles).toBe(1);
    expect(stats.errorCount).toBe(1);
    expect(stats.warningCount).toBe(1);
  });
  
  it('should format summary correctly', () => {
    // Setup
    const stats = {
      totalFiles: 10,
      validFiles: 8,
      errorCount: 3,
      warningCount: 5
    };
    
    // Execute
    const summary = generateReports.formatSummary(stats);
    
    // Verify
    expect(summary).toContain('10 files validated');
    expect(summary).toContain('8/10 documents (80%) are valid');
    expect(summary).toContain('3 errors');
    expect(summary).toContain('5 warnings');
  });
  
  it('should analyze cross-references between documents', () => {
    // Setup - create documents with cross-references
    fs.readFileSync.mockReturnValueOnce(`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
status: "DRAFT"
references:
  - id: "REF001"
    target: "SRS-001"
---

# Document with references`).mockReturnValueOnce(`---
documentType: "SRS"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
status: "DRAFT"
id: "SRS-001"
---

# Referenced document`);
    
    // Execute
    try {
      generateReports.generateReports();
    } catch (e) {
      // Ignore process.exit error
    }
    
    // Verify
    expect(fs.writeFileSync).toHaveBeenCalled();
    // Find the call that writes the cross-reference report
    const crossRefCall = fs.writeFileSync.mock.calls.find(
      call => typeof call[1] === 'string' && call[1].includes('cross-references')
    );
    expect(crossRefCall).toBeDefined();
  });
  
  it('should generate detailed report for each document', () => {
    // Setup
    const mockValidationResult = {
      isValid: false,
      errors: [{ message: 'Error 1', code: 'E001', path: 'section.title' }],
      warnings: [{ message: 'Warning 1', code: 'W001', path: 'metadata' }]
    };
    
    // Mock validation to return the result
    generateReports.validateDocument = jest.fn().mockReturnValue(mockValidationResult);
    
    // Execute
    try {
      generateReports.generateReports();
    } catch (e) {
      // Ignore process.exit error
    }
    
    // Verify
    expect(fs.writeFileSync).toHaveBeenCalled();
    // At least one call should include the error message
    const errorReportCall = fs.writeFileSync.mock.calls.find(
      call => typeof call[1] === 'string' && call[1].includes('Error 1')
    );
    expect(errorReportCall).toBeDefined();
  });
  
  it('should handle YAML parsing errors gracefully', () => {
    // Setup
    yaml.load = jest.fn().mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    
    // Execute
    try {
      generateReports.generateReports();
    } catch (e) {
      // Ignore process.exit error
    }
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Error parsing');
  });
  
  it('should extract document metadata correctly', () => {
    // Setup
    fs.readFileSync.mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.5.0"
documentVersion: "2.3.1"
status: "APPROVED"
---

# Document Title`);
    
    // Execute
    const metadata = generateReports.extractDocumentMetadata('test.md');
    
    // Verify
    expect(metadata.documentType).toBe('PRD');
    expect(metadata.schemaVersion).toBe('1.5.0');
    expect(metadata.documentVersion).toBe('2.3.1');
    expect(metadata.status).toBe('APPROVED');
  });
});