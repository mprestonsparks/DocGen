/**
 * Comprehensive tests for validation.ts module
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import * as config from '../src/utils/config';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn(),
  basename: jest.fn()
}));

jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

jest.mock('../src/utils/config', () => ({
  getOutputDir: jest.fn(),
  isAdvancedValidationEnabled: jest.fn()
}));

// Mock logger
const mockError = jest.fn();
const mockWarn = jest.fn();
jest.mock('../src/utils/logger', () => ({
  error: mockError,
  warn: mockWarn,
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

// Import validation after mocking dependencies
import * as validation from '../src/utils/validation';

// Sample documents for testing
const validDocument = `---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2025-03-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
---

# Test Project Product Requirements Document

## 1. DOCUMENT CONTROL

### 1.1. REVISION HISTORY

| VERSION | DATE | DESCRIPTION | AUTHOR |
|---------|------|-------------|--------|
| 1.0.0   | 2025-03-01 | Initial draft | DocGen |

## 2. INTRODUCTION

This document describes the product requirements for Test Project.

## 3. VISION

Our vision is to create...

## 4. OBJECTIVES

Primary objectives include...

## 5. TARGET AUDIENCE

This product targets...

## 6. SUCCESS METRICS

We will measure success by...
`;

const invalidDocument = `---
documentType: "PRD"
schemaVersion: "1.0.0"
# Missing required fields
---

# Incomplete Document

This document is missing required fields.
`;

const documentWithoutFrontmatter = `# Document Without Frontmatter

This document has no YAML frontmatter.
`;

const documentWithInvalidFrontmatter = `---
invalid: yaml: structure:
---

# Document with Invalid YAML

This document has invalid YAML frontmatter.
`;

const documentWithRelatedReferences = `---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2025-03-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
related:
  - id: "DOC-SRS-001"
    type: "IMPLEMENTS"
    description: "Software Requirements Specification"
  - id: "DOC-MISSING-001"
    type: "REFERENCES"
---

# Document with Related References

This document has references to other documents.
`;

const documentWithInvalidJson = `---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2025-03-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
---

# Document with Invalid JSON Block

\`\`\`json
{
  "key": "value",
  invalid json
}
\`\`\`
`;

const documentWithTerminologyInconsistencies = `---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2025-03-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
---

# Document with Terminology Inconsistencies

This document mentions e-mail and front-end instead of email and frontend.
`;

describe('Validation Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock values
    (config.getOutputDir as jest.Mock).mockReturnValue('/mock/output');
    (config.isAdvancedValidationEnabled as jest.Mock).mockReturnValue(false);
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });
  
  describe('validateDocument function', () => {
    test('should identify non-existent document', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      const result = validation.validateDocument('/path/to/nonexistent.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('DOC_NOT_FOUND');
    });
    
    test('should identify document without frontmatter', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithoutFrontmatter);
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('NO_FRONTMATTER');
    });
    
    test('should identify document with invalid frontmatter YAML', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithInvalidFrontmatter);
      (yaml.load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('INVALID_FRONTMATTER');
    });
    
    test('should identify missing required fields', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(invalidDocument);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0"
        // Missing required fields
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });
    
    test('should identify missing project information', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(invalidDocument);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001"
        // Missing project field
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_PROJECT_INFO')).toBe(true);
    });
    
    test('should identify missing project ID and name', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(invalidDocument);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {} // Empty project object
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_PROJECT_ID')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_PROJECT_NAME')).toBe(true);
    });
    
    test('should validate related document references', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithRelatedReferences);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {
          id: "PROJ-001",
          name: "Test Project"
        },
        related: [
          { id: "DOC-SRS-001", type: "IMPLEMENTS" }, // Missing description
          { type: "REFERENCES", description: "Missing ID" }, // Missing ID
          { id: "DOC-SAD-001", description: "Missing type" } // Missing type
        ]
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      // Check for missing reference ID error
      expect(result.errors.some(e => e.code === 'MISSING_REFERENCE_ID')).toBe(true);
      // Check for missing reference type error
      expect(result.errors.some(e => e.code === 'MISSING_REFERENCE_TYPE')).toBe(true);
      // Check for missing reference description warning
      expect(result.warnings.some(w => w.code === 'MISSING_REFERENCE_DESCRIPTION')).toBe(true);
    });
    
    test('should validate JSON blocks in content', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithInvalidJson);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {
          id: "PROJ-001",
          name: "Test Project"
        }
      });
      
      // Mock JSON.parse to throw an error for the invalid JSON block
      const originalJSONParse = JSON.parse;
      JSON.parse = jest.fn().mockImplementation(() => {
        throw new Error('Invalid JSON');
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Cleanup
      JSON.parse = originalJSONParse;
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_JSON_BLOCK')).toBe(true);
    });
    
    test('should validate valid document successfully', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(validDocument);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {
          id: "PROJ-001",
          name: "Test Project"
        }
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    test('should handle errors gracefully', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
      expect(mockError).toHaveBeenCalled();
    });
  });
  
  describe('Advanced Validation', () => {
    test('should check for cross-reference integrity when advanced validation is enabled', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithRelatedReferences);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {
          id: "PROJ-001",
          name: "Test Project"
        },
        related: [
          { id: "DOC-SRS-001", type: "IMPLEMENTS", description: "SRS" },
          { id: "DOC-MISSING-001", type: "REFERENCES", description: "Missing Doc" }
        ]
      });
      
      // Enable advanced validation
      (config.isAdvancedValidationEnabled as jest.Mock).mockReturnValue(true);
      
      // Mock readdirSync to return files
      (fs.readdirSync as jest.Mock).mockReturnValue(['test-project-srs.md']);
      
      // Mock readFileSync for document lookup
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (typeof filePath === 'string' && filePath.includes('srs')) {
          return `---
documentType: "SRS"
id: "DOC-SRS-001"
---`;
        }
        return documentWithRelatedReferences;
      });
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.warnings.some(w => w.code === 'MISSING_REFERENCED_DOCUMENT')).toBe(true);
    });
    
    test('should check for terminology consistency when advanced validation is enabled', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithTerminologyInconsistencies);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {
          id: "PROJ-001",
          name: "Test Project"
        }
      });
      
      // Enable advanced validation
      (config.isAdvancedValidationEnabled as jest.Mock).mockReturnValue(true);
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.warnings.some(w => w.code === 'TERMINOLOGY_INCONSISTENCY')).toBe(true);
    });
    
    test('should check for required headings when advanced validation is enabled', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2025-03-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
---

# Document Missing Required Headings

This document is missing required headings.
`);
      (yaml.load as jest.Mock).mockReturnValue({
        documentType: "PRD",
        schemaVersion: "1.0.0",
        documentVersion: "1.0.0",
        lastUpdated: "2025-03-01",
        status: "DRAFT",
        id: "DOC-PRD-001",
        project: {
          id: "PROJ-001",
          name: "Test Project"
        }
      });
      
      // Enable advanced validation
      (config.isAdvancedValidationEnabled as jest.Mock).mockReturnValue(true);
      
      // Execute
      const result = validation.validateDocument('/path/to/doc.md');
      
      // Verify
      expect(result.warnings.some(w => w.code === 'MISSING_REQUIRED_HEADING')).toBe(true);
    });
  });
  
  describe('validateAllDocuments function', () => {
    test('should validate multiple documents', () => {
      // Setup
      const outputDir = '/mock/output';
      (config.getOutputDir as jest.Mock).mockReturnValue(outputDir);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['doc1.md', 'doc2.md', 'README.md']);
      
      // Prepare for validateDocument calls
      jest.spyOn(validation, 'validateDocument').mockImplementation((filePath: string) => {
        if (filePath.includes('doc1')) {
          return { isValid: true, errors: [], warnings: [] };
        } else {
          return { 
            isValid: false, 
            errors: [{ 
              code: 'TEST_ERROR', 
              message: 'Test error', 
              location: filePath,
              severity: 'error'
            }], 
            warnings: [] 
          };
        }
      });
      
      // Execute
      const results = validation.validateAllDocuments();
      
      // Verify
      expect(Object.keys(results).length).toBe(3); // All files including README.md also get filtered
      expect(results[`${outputDir}/doc1.md`]).toBeDefined();
      expect(results[`${outputDir}/doc1.md`].isValid).toBe(true);
      expect(results[`${outputDir}/doc2.md`]).toBeDefined();
      expect(results[`${outputDir}/doc2.md`].isValid).toBe(false);
    });
    
    test('should handle non-existent output directory', () => {
      // Setup
      (config.getOutputDir as jest.Mock).mockReturnValue('/mock/output');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      const results = validation.validateAllDocuments();
      
      // Verify
      expect(Object.keys(results).length).toBe(0);
    });
    
    test('should handle errors gracefully', () => {
      // Setup
      (config.getOutputDir as jest.Mock).mockReturnValue('/mock/output');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });
      
      // Execute
      const results = validation.validateAllDocuments();
      
      // Verify
      expect(Object.keys(results).length).toBe(0);
      expect(mockError).toHaveBeenCalled();
    });
  });
});