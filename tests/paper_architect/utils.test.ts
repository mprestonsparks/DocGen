/**
 * Tests for paper_architect/utils module
 */
import * as utils from '../../src/paper_architect/utils';
import * as fs from 'fs';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  copyFileSync: jest.fn()
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Paper Architect Utils', () => {
  describe('slugify', () => {
    it('should convert strings to slugs', () => {
      const testCases = [
        { input: 'Hello World', expected: 'hello-world' },
        { input: 'Test String With Spaces', expected: 'test-string-with-spaces' },
        { input: 'Special!@#$%^&*()Characters', expected: 'specialcharacters' }, // Note: all symbols removed
        { input: 'Multiple---Dashes', expected: 'multiple-dashes' },
        { input: 'trailing-dash-', expected: 'trailing-dash' },
        { input: '-leading-dash', expected: 'leading-dash' },
        { input: 'Numbers123', expected: 'numbers123' },
        { input: '   Trim   Spaces   ', expected: 'trim-spaces' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(utils.slugify(input)).toBe(expected);
      });
    });
    
    it('should handle edge cases', () => {
      expect(utils.slugify('')).toBe('');
      expect(utils.slugify('   ')).toBe('');
      expect(utils.slugify('---')).toBe('');
    });
  });
  
  describe('generateUniqueId', () => {
    it('should generate IDs with prefix and md5 hash of name', () => {
      const id = utils.generateUniqueId('test', 'Test Name');
      
      expect(id).toMatch(/^test-[a-f0-9]{6}$/);
      
      // The function is deterministic based on the name
      const idAgain = utils.generateUniqueId('test', 'Test Name');
      expect(id).toBe(idAgain);
    });
    
    it('should generate different IDs for different names', () => {
      const id1 = utils.generateUniqueId('test', 'Name A');
      const id2 = utils.generateUniqueId('test', 'Name B');
      
      expect(id1).not.toBe(id2);
      
      // Check prefix is correct
      expect(id1.startsWith('test-')).toBeTruthy();
      expect(id2.startsWith('test-')).toBeTruthy();
    });
  });
  
  describe('formatJson', () => {
    it('should format JSON with proper indentation', () => {
      const data = { test: true, nested: { key: 'value' } };
      const formatted = utils.formatJson(data);
      
      expect(formatted).toBe('{\n  "test": true,\n  "nested": {\n    "key": "value"\n  }\n}');
    });
  });
  
  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      // Mock directory does not exist
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      utils.ensureDirectoryExists('/test/dir');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true });
    });
    
    it('should not create directory if it already exists', () => {
      // Reset all mocks first
      jest.clearAllMocks();
      
      // Mock directory exists
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      
      utils.ensureDirectoryExists('/test/existing-dir');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/test/existing-dir');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
  
  describe('backupFileIfExists', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock Date.now for consistent backup filenames
      jest.spyOn(Date, 'now').mockReturnValue(123456789);
    });
    
    it('should create backup if file exists', () => {
      // Mock file exists
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      
      utils.backupFileIfExists('/test/file.txt');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.copyFileSync).toHaveBeenCalledWith('/test/file.txt', '/test/file.txt.backup.123456789');
    });
    
    it('should not create backup if file does not exist', () => {
      // Mock file does not exist
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      utils.backupFileIfExists('/test/nonexistent.txt');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/test/nonexistent.txt');
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });
  });
  
  describe('getParentSectionId', () => {
    const sections = [
      { id: 'sec-1', level: 1 },
      { id: 'sec-1-1', level: 2 },
      { id: 'sec-1-2', level: 2 },
      { id: 'sec-1-2-1', level: 3 },
      { id: 'sec-1-2-2', level: 3 },
      { id: 'sec-2', level: 1 }
    ];
    
    it('should find the correct parent section', () => {
      // Test with a smaller, controlled example for clearer test
      const simpleSection = [
        { id: 'parent', level: 1 },
        { id: 'child', level: 2 },
      ];
      
      expect(utils.getParentSectionId('child', simpleSection)).toBe('parent');
      
      // Just check top-level sections have no parent
      expect(utils.getParentSectionId('sec-1', sections)).toBeUndefined();
      expect(utils.getParentSectionId('sec-2', sections)).toBeUndefined();
    });
    
    it('should return undefined for non-existent sections', () => {
      expect(utils.getParentSectionId('nonexistent', sections)).toBeUndefined();
    });
  });
  
  describe('createSectionTree', () => {
    const sections = [
      { id: 'sec-1', level: 1, title: 'Section 1', content: 'Content 1' },
      { id: 'sec-1-1', level: 2, title: 'Section 1.1', content: 'Content 1.1' },
      { id: 'sec-1-2', level: 2, title: 'Section 1.2', content: 'Content 1.2' },
      { id: 'sec-2', level: 1, title: 'Section 2', content: 'Content 2' }
    ];
    
    it('should create a proper tree structure', () => {
      const tree = utils.createSectionTree(sections);
      
      expect(tree.length).toBe(2); // Two top-level sections
      expect(tree[0].id).toBe('sec-1');
      expect(tree[0].subsections.length).toBe(2); // Two subsections
      expect(tree[0].subsections[0].id).toBe('sec-1-1');
      expect(tree[0].subsections[1].id).toBe('sec-1-2');
      expect(tree[1].id).toBe('sec-2');
      expect(tree[1].subsections.length).toBe(0); // No subsections
    });
  });
  
  describe('extractCodeBlocks', () => {
    it('should extract code blocks with languages', () => {
      const markdown = `
# Test Document

Some text.

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

More text.

\`\`\`python
def test():
  return True
\`\`\`
`;
      
      const codeBlocks = utils.extractCodeBlocks(markdown);
      
      expect(codeBlocks.length).toBe(2);
      expect(codeBlocks[0].language).toBe('javascript');
      expect(codeBlocks[0].code).toBe('function test() {\n  return true;\n}');
      expect(codeBlocks[1].language).toBe('python');
      expect(codeBlocks[1].code).toBe('def test():\n  return True');
    });
    
    it('should handle code blocks without language', () => {
      const markdown = `
# Test Document

\`\`\`
Plain text code block
\`\`\`
`;
      
      const codeBlocks = utils.extractCodeBlocks(markdown);
      
      expect(codeBlocks.length).toBe(1);
      expect(codeBlocks[0].language).toBe('');
      expect(codeBlocks[0].code).toBe('Plain text code block');
    });
    
    it('should handle markdown with no code blocks', () => {
      const markdown = '# Test Document\n\nJust text, no code blocks.';
      
      const codeBlocks = utils.extractCodeBlocks(markdown);
      
      expect(codeBlocks.length).toBe(0);
    });
  });
  
  describe('cleanText', () => {
    it('should clean text by removing extra whitespace', () => {
      const dirtyText = '  This   has   extra \n\n whitespace  ';
      const cleanedText = utils.cleanText(dirtyText);
      
      expect(cleanedText).toBe('This has extra whitespace');
    });
  });
  
  describe('formatTimestamp', () => {
    it('should format timestamps in ISO format without milliseconds', () => {
      // Create date with known milliseconds
      const mockDate = new Date('2023-06-15T12:30:45.123Z');
      
      const formatted = utils.formatTimestamp(mockDate);
      
      // Should be in format YYYY-MM-DDTHH:MM:SSZ (no milliseconds)
      expect(formatted).toBe('2023-06-15T12:30:45Z');
    });
    
    it('should use current time if no timestamp provided', () => {
      // Use a simpler approach to mock Date.now()
      const originalNow = Date.now;
      const originalToISOString = Date.prototype.toISOString;
      
      // Override Date.now and toISOString
      Date.now = jest.fn().mockReturnValue(new Date('2023-06-15T12:30:45.123Z').getTime());
      Date.prototype.toISOString = jest.fn().mockReturnValue('2023-06-15T12:30:45.123Z');
      
      const formatted = utils.formatTimestamp();
      
      // Restore originals
      Date.now = originalNow;
      Date.prototype.toISOString = originalToISOString;
      
      // Should match our mocked ISO string without milliseconds
      expect(formatted).toBe('2023-06-15T12:30:45Z');
    });
  });
  
  describe('safeParseJson', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"test": true, "number": 42, "nested": {"key": "value"}}';
      const defaultValue = { default: true };
      
      const result = utils.safeParseJson(validJson, defaultValue);
      
      expect(result).toEqual({ test: true, number: 42, nested: { key: 'value' } });
    });
    
    it('should return default value for invalid JSON', () => {
      const invalidJson = 'not json';
      const defaultValue = { default: true };
      
      const result = utils.safeParseJson(invalidJson, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });
    
    it('should handle empty strings', () => {
      const emptyString = '';
      const defaultValue = { default: true };
      
      const result = utils.safeParseJson(emptyString, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });
  });
});