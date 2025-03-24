/**
 * Tests for paper_architect/utils module
 */
import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../../../src/paper_architect/utils';
import * as logger from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  copyFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('paper_architect/utils module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('slugify', () => {
    it('should convert strings to slug format', () => {
      expect(utils.slugify('Test String')).toBe('test-string');
      expect(utils.slugify('Complex!@# String-With_Chars')).toBe('complex-string-with-chars');
      expect(utils.slugify('   multiple   spaces   ')).toBe('multiple-spaces');
      expect(utils.slugify('leading-and-trailing-hyphens-')).toBe('leading-and-trailing-hyphens');
      expect(utils.slugify('-leading-and-trailing-hyphens')).toBe('leading-and-trailing-hyphens');
    });
  });

  describe('generateUniqueId', () => {
    it('should generate a unique ID with the correct format', () => {
      const id1 = utils.generateUniqueId('test', 'Test Name');
      const id2 = utils.generateUniqueId('test', 'Different Name');
      
      // Check format using regex
      expect(id1).toMatch(/^test-[a-f0-9]{6}$/);
      expect(id2).toMatch(/^test-[a-f0-9]{6}$/);
      
      // IDs should be different for different names
      expect(id1).not.toBe(id2);
      
      // IDs should be consistent for the same name
      expect(utils.generateUniqueId('test', 'Test Name')).toBe(id1);
    });
  });

  describe('formatJson', () => {
    it('should format objects as JSON with proper indentation', () => {
      const data = { test: true, nested: { value: 42 } };
      const formatted = utils.formatJson(data);
      
      expect(formatted).toBe(JSON.stringify(data, null, 2));
      expect(formatted).toContain('\n  "test": true');
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      utils.ensureDirectoryExists('/path/to/dir');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
      expect(logger.info).toHaveBeenCalledWith('Created directory: /path/to/dir');
    });
    
    it('should not create directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      utils.ensureDirectoryExists('/path/to/dir');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('backupFileIfExists', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(123456789);
    });
    
    it('should create a backup if file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      utils.backupFileIfExists('/path/to/file.txt');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.txt');
      expect(fs.copyFileSync).toHaveBeenCalledWith('/path/to/file.txt', '/path/to/file.txt.backup.123456789');
      expect(logger.info).toHaveBeenCalledWith('Created backup of existing file: /path/to/file.txt.backup.123456789');
    });
    
    it('should not create a backup if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      utils.backupFileIfExists('/path/to/file.txt');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.txt');
      expect(fs.copyFileSync).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('getParentSectionId', () => {
    const sections = [
      { id: 'sec-1', level: 1 },
      { id: 'sec-2', level: 2 },
      { id: 'sec-3', level: 2 },
      { id: 'sec-4', level: 3 },
      { id: 'sec-5', level: 1 },
    ];
    
    it('should find the correct parent section ID', () => {
      expect(utils.getParentSectionId('sec-2', sections)).toBe('sec-1');
      expect(utils.getParentSectionId('sec-3', sections)).toBe('sec-1');
      expect(utils.getParentSectionId('sec-4', sections)).toBe('sec-2');
      expect(utils.getParentSectionId('sec-5', sections)).toBeUndefined();
    });
    
    it('should return undefined for top-level sections or nonexistent IDs', () => {
      expect(utils.getParentSectionId('sec-1', sections)).toBeUndefined();
      expect(utils.getParentSectionId('nonexistent', sections)).toBeUndefined();
    });
  });

  describe('createSectionTree', () => {
    const sections = [
      { id: 'sec-1', level: 1, title: 'Section 1', content: 'Content 1' },
      { id: 'sec-2', level: 2, title: 'Section 1.1', content: 'Content 2' },
      { id: 'sec-3', level: 2, title: 'Section 1.2', content: 'Content 3' },
      { id: 'sec-4', level: 3, title: 'Section 1.2.1', content: 'Content 4' },
      { id: 'sec-5', level: 1, title: 'Section 2', content: 'Content 5' },
    ];
    
    it('should create a proper tree structure from flat sections', () => {
      const tree = utils.createSectionTree(sections);
      
      expect(tree.length).toBe(2); // Two top-level sections
      
      // Check first top-level section and its children
      expect(tree[0].id).toBe('sec-1');
      expect(tree[0].subsections.length).toBe(2);
      expect(tree[0].subsections[0].id).toBe('sec-2');
      expect(tree[0].subsections[1].id).toBe('sec-3');
      expect(tree[0].subsections[1].subsections.length).toBe(1);
      expect(tree[0].subsections[1].subsections[0].id).toBe('sec-4');
      
      // Check second top-level section
      expect(tree[1].id).toBe('sec-5');
      expect(tree[1].subsections.length).toBe(0);
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract code blocks with language from markdown', () => {
      const markdown = `
# Test Markdown

Here is some text.

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

More text here.

\`\`\`python
def another_test():
    return True
\`\`\`

\`\`\`
no language specified
\`\`\`
      `;
      
      const codeBlocks = utils.extractCodeBlocks(markdown);
      
      expect(codeBlocks.length).toBe(3);
      
      expect(codeBlocks[0].language).toBe('javascript');
      expect(codeBlocks[0].code).toBe('function test() {\n  return true;\n}');
      
      expect(codeBlocks[1].language).toBe('python');
      expect(codeBlocks[1].code).toBe('def another_test():\n    return True');
      
      expect(codeBlocks[2].language).toBe('');
      expect(codeBlocks[2].code).toBe('no language specified');
    });
    
    it('should return an empty array if no code blocks are found', () => {
      const markdown = '# Test Markdown\n\nNo code blocks here.';
      expect(utils.extractCodeBlocks(markdown).length).toBe(0);
    });
  });

  describe('cleanText', () => {
    it('should clean text by removing extra whitespace', () => {
      expect(utils.cleanText('  Multiple   spaces   ')).toBe('Multiple spaces');
      expect(utils.cleanText('Line\nbreaks\r\nand\ttabs')).toBe('Line breaks and tabs');
      expect(utils.cleanText('     ')).toBe('');
    });
  });

  describe('formatTimestamp', () => {
    it('should format date as ISO string without milliseconds', () => {
      const date = new Date('2023-01-01T12:34:56.789Z');
      expect(utils.formatTimestamp(date)).toBe('2023-01-01T12:34:56Z');
    });
    
    it('should use current date if no date is provided', () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string);
      
      const formatted = utils.formatTimestamp();
      expect(formatted).toBe('2023-01-01T00:00:00Z');
      
      (global.Date as jest.Mock).mockRestore();
    });
  });

  describe('safeParseJson', () => {
    it('should parse valid JSON strings', () => {
      const validJson = '{"test": true, "value": 42}';
      const defaultValue = { default: true };
      
      const result = utils.safeParseJson(validJson, defaultValue);
      
      expect(result).toEqual({ test: true, value: 42 });
    });
    
    it('should return the default value for invalid JSON', () => {
      const invalidJson = 'not valid json';
      const defaultValue = { default: true };
      
      const result = utils.safeParseJson(invalidJson, defaultValue);
      
      expect(result).toEqual(defaultValue);
      expect(logger.error).toHaveBeenCalledWith('Error parsing JSON', expect.any(Object));
    });
  });
});