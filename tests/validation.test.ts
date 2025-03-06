/**
 * Tests for validation utility
 */
import fs from 'fs';
import path from 'path';
import { validateDocument, validateAllDocuments } from '../src/utils/validation';

// Mock config
jest.mock('../src/utils/config', () => ({
  getOutputDir: jest.fn(() => path.join(__dirname, 'fixtures/output')),
  isAdvancedValidationEnabled: jest.fn(() => true)
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn()
}));

describe('Validation Utility', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDocument', () => {
    it('should return error if document does not exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      const result = validateDocument('/path/to/nonexistent.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('DOC_NOT_FOUND');
    });

    it('should validate a valid document', () => {
      // Setup
      const validDocument = 
`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2023-04-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
related:
  - id: "DOC-SRS-001"
    type: "IMPLEMENTED_BY"
    description: "Software Requirements Specification"
---

# Test Project Product Requirements Document

## DOCUMENT CONTROL

### REVISION HISTORY

| REV_ID | DATE_ISO | DESCRIPTION | AUTHOR_ID |
|--------|----------|-------------|-----------|
| REV001 | 2023-04-01 | Initial version | AUTH001 |

## VISION

This is the vision for the project.

## OBJECTIVES

\`\`\`json
{
  "objectives": [
    {
      "description": "Objective 1",
      "target": "Target 1"
    }
  ]
}
\`\`\`

## TARGET AUDIENCE

The target audience is developers.

## SUCCESS METRICS

Success metrics include...`;

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(validDocument);
      
      // Execute
      const result = validateDocument('/path/to/valid.md');
      
      // Verify
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return errors for missing required fields', () => {
      // Setup
      const invalidDocument = 
`---
documentType: "PRD"
# Missing required fields
---

# Content`;

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(invalidDocument);
      
      // Execute
      const result = validateDocument('/path/to/invalid.md');
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });

    it('should validate JSON blocks in the document', () => {
      // Setup
      const documentWithInvalidJson = 
`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2023-04-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
---

# Content

\`\`\`json
{
  invalid json with no quotes and syntax errors
}
\`\`\``;

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(documentWithInvalidJson);
      
      // Mock JSON.parse to throw an error
      const originalJSONParse = JSON.parse;
      JSON.parse = jest.fn().mockImplementation(() => {
        throw new SyntaxError('Invalid JSON');
      });
      
      try {
        // Execute
        const result = validateDocument('/path/to/invalid-json.md');
        
        // Verify
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_JSON_BLOCK')).toBe(true);
      } finally {
        // Restore original JSON.parse
        JSON.parse = originalJSONParse;
      }
    });
  });

  describe('validateAllDocuments', () => {
    it('should return empty object if output directory does not exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      const results = validateAllDocuments();
      
      // Verify
      expect(Object.keys(results).length).toBe(0);
    });

    it('should validate all documents in the output directory', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['doc1.md', 'doc2.md', 'not-a-doc.txt']);
      
      const validDocument = 
`---
documentType: "PRD"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "2023-04-01"
status: "DRAFT"
id: "DOC-PRD-001"
project:
  id: "PROJ-001"
  name: "Test Project"
related:
  - id: "DOC-SRS-001"
    type: "IMPLEMENTED_BY"
    description: "Software Requirements Specification"
---

# Content`;

      const invalidDocument = 
`---
# Invalid document
---

# Content`;

      // Simulate different file content for each file
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('doc1.md')) {
          return validDocument;
        } else {
          return invalidDocument;
        }
      });
      
      // Execute
      const results = validateAllDocuments();
      
      // Verify
      expect(Object.keys(results).length).toBe(2); // Should validate 2 markdown files
      expect(results[path.join(__dirname, 'fixtures/output/doc1.md')].isValid).toBe(true);
      expect(results[path.join(__dirname, 'fixtures/output/doc2.md')].isValid).toBe(false);
    });
  });
});