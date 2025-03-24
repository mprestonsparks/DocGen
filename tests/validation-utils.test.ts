/**
 * Tests for validation utilities in validation.ts
 */
import fs from 'fs';
import path from 'path';
import * as validation from '../src/utils/validation';
import * as config from '../src/utils/config';
import { ValidationResult, ValidationError, ValidationWarning } from '../src/types';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn()
}));

// Mock dependencies
jest.mock('../src/utils/config', () => ({
  getOutputDir: jest.fn().mockReturnValue('/test/output'),
  isAdvancedValidationEnabled: jest.fn().mockReturnValue(true),
  getLogLevel: jest.fn().mockReturnValue('info')
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('Validation utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('validateDocument', () => {
    it('should return error if document does not exist', () => {
      // Mock file non-existence
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = validation.validateDocument('/test/doc.md');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DOC_NOT_FOUND');
    });
    
    it('should detect missing YAML frontmatter', () => {
      // Mock file existence and content
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`# Test Document

This is a test document without frontmatter.`);
      
      const result = validation.validateDocument('/test/doc.md');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NO_FRONTMATTER');
    });
    
    it('should detect invalid YAML frontmatter', () => {
      // Mock file existence and content with invalid YAML
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
title: Test Document
  invalid: indentation
---

# Test Document`);
      
      const result = validation.validateDocument('/test/doc.md');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_FRONTMATTER');
    });
    
    it('should detect missing required fields in frontmatter', () => {
      // Mock file existence and content with missing required fields
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
title: Test Document
# Missing required fields
---

# Test Document`);
      
      const result = validation.validateDocument('/test/doc.md');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should detect missing required fields
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });
    
    it('should validate document with valid required fields', () => {
      // Mock file existence and content with all required fields
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
documentType: PRD
schemaVersion: 1.0.0
documentVersion: 1.0.0
lastUpdated: 2023-06-01
status: draft
id: DOC-PRD-001
project:
  id: PROJ-001
  name: Test Project
---

# Test Document

This is a test document.`);
      
      // Mock advanced validation
      (config.isAdvancedValidationEnabled as jest.Mock).mockReturnValue(false);
      
      const result = validation.validateDocument('/test/doc.md');
      
      // Since we're mocking the content with all required fields,
      // and disabling advanced validation, this should pass
      expect(result.errors).toEqual([]);
    });
  });
  
  describe('validateAllDocuments', () => {
    it('should validate all documents in output directory', () => {
      // Mock directory contents
      (fs.readdirSync as jest.Mock).mockReturnValue(['doc1.md', 'doc2.md']);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock valid and invalid documents
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(`---
documentType: PRD
schemaVersion: 1.0.0
documentVersion: 1.0.0
lastUpdated: 2023-06-01
status: draft
id: DOC-PRD-001
project:
  id: PROJ-001
  name: Test Project
---

# Valid Document`)
        .mockReturnValueOnce(`# Invalid Document

Missing frontmatter.`);
      
      const results = validation.validateAllDocuments();
      
      // Should return results for both documents
      expect(Object.keys(results).length).toBe(2);
      
      // First document should be valid
      const validDocPath = path.join('/test/output', 'doc1.md');
      expect(results[validDocPath].isValid).toBe(true);
      
      // Second document should be invalid
      const invalidDocPath = path.join('/test/output', 'doc2.md');
      expect(results[invalidDocPath].isValid).toBe(false);
    });
    
    it('should handle empty output directory', () => {
      // Mock empty directory
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      
      const results = validation.validateAllDocuments();
      
      // Should return empty object
      expect(Object.keys(results).length).toBe(0);
    });
    
    it('should handle nonexistent output directory', () => {
      // Mock nonexistent directory
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const results = validation.validateAllDocuments();
      
      // Should return empty object
      expect(Object.keys(results).length).toBe(0);
    });
  });
});