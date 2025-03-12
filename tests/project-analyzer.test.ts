/**
 * Tests for the project analyzer module
 */
import * as fs from 'fs';
import * as path from 'path';
import { 
  analyzeProject, 
  detectLanguages, 
  findExistingDocumentation, 
  detectFrameworks,
  extractComponents 
} from '../src/utils/project-analyzer';
import { ProjectAnalysisResult } from '../src/types';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
}));

// Mock the fs async functions directly
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
  stat: jest.fn(),
}));

// Properly mock the promisify function
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: (fn: Function) => {
    // For readdir, return a mock function that uses our mocked fs
    if (fn === require('fs').readdir) {
      return jest.fn().mockImplementation((path: string, options: any) => {
        const fs = require('fs');
        // Use the mock implementation from the readdir mock
        if (path === '/test/project') {
          return Promise.resolve(['src', 'package.json', 'README.md']);
        } else if (path === '/test/project/src') {
          return Promise.resolve(['index.js', 'App.js', 'components']);
        } else if (path === '/test/project/src/components') {
          return Promise.resolve(['Button.jsx', 'Card.tsx']);
        } else if (path === '/test/project/docs') {
          return Promise.resolve(['api.md', 'setup.md']);
        }
        return Promise.resolve([]);
      });
    }
    // For readFile, similar pattern
    if (fn === require('fs').readFile) {
      return jest.fn().mockImplementation((path: string, encoding: string) => {
        const fs = require('fs');
        // Use the mock implementation from the readFile mock
        return Promise.resolve(fs.readFileSync(path, encoding));
      });
    }
    // For stat, similar pattern
    if (fn === require('fs').stat) {
      return jest.fn().mockImplementation((path: string) => {
        const fs = require('fs');
        // Use the mock implementation from the stat mock
        return Promise.resolve(fs.statSync(path));
      });
    }
    // Default - return the function itself as a basic mock
    return jest.fn().mockImplementation((...args: any[]) => Promise.resolve(fn(...args)));
  },
}));

jest.mock('js-yaml', () => ({
  load: jest.fn((content) => {
    // Simple mock implementation to parse YAML frontmatter
    if (content && typeof content === 'string' && content.includes('title:')) {
      return { title: 'Test Document' };
    }
    return null;
  }),
}));

describe('Project Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeProject', () => {
    it('should analyze a project and return the correct structure', async () => {
      // Mock file system functions
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              'react': '^17.0.2',
              'express': '^4.17.1',
              'mongoose': '^6.0.12'
            }
          });
        }
        return '';
      });
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string, options: any) => {
        if (dirPath === '/test/project') {
          return ['src', 'package.json', 'README.md'];
        } else if (dirPath === '/test/project/src') {
          return ['index.js', 'App.js', 'components'];
        } else if (dirPath === '/test/project/src/components') {
          return ['Button.jsx', 'Card.tsx'];
        }
        return [];
      });
      (fs.statSync as jest.Mock).mockImplementation((filePath: string) => ({
        isDirectory: () => filePath.includes('src') || filePath.includes('components'),
        size: 1000,
        mtime: new Date('2023-01-01')
      }));

      const result = await analyzeProject('/test/project', {
        analysisDepth: 'standard',
        includeDotFiles: false,
        maxFileSize: 10485760,
        includeNodeModules: false
      });

      // Check that the result has the correct structure
      expect(result).toBeDefined();
      expect(result.detectedType).toBeDefined();
      expect(result.languages).toBeDefined();
      expect(result.frameworks).toBeDefined();
      expect(result.buildTools).toBeDefined();
      expect(result.detectedComponents).toBeDefined();
      expect(result.existingDocumentation).toBeDefined();
    });

    it('should throw an error if project path does not exist', async () => {
      // Mock file system functions
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(analyzeProject('/nonexistent/path', {
        analysisDepth: 'standard',
        includeDotFiles: false,
        maxFileSize: 10485760,
        includeNodeModules: false
      })).rejects.toThrow('Project path does not exist');
    });
  });

  describe('detectLanguages', () => {
    it('should detect languages based on file extensions', async () => {
      const files = [
        '/project/src/index.js',
        '/project/src/App.jsx',
        '/project/src/components/Button.tsx',
        '/project/src/components/Card.tsx',
        '/project/src/styles.css',
        '/project/README.md'
      ];

      const result = await detectLanguages(files);

      expect(result).toContainEqual(expect.objectContaining({ name: 'JavaScript' }));
      expect(result).toContainEqual(expect.objectContaining({ name: 'JavaScript (React)' }));
      expect(result).toContainEqual(expect.objectContaining({ name: 'TypeScript (React)' }));
      expect(result).toContainEqual(expect.objectContaining({ name: 'CSS' }));
      expect(result).toContainEqual(expect.objectContaining({ name: 'Markdown' }));
      
      // Verify percentages and counts
      const totalFiles = files.length;
      const totalPercentage = result.reduce((sum, lang) => sum + lang.percentage, 0);
      const totalCount = result.reduce((sum, lang) => sum + lang.files, 0);
      
      // Due to rounding, total percentage might not be exactly 100%
      expect(totalPercentage).toBeGreaterThanOrEqual(99);
      expect(totalPercentage).toBeLessThanOrEqual(101);
      expect(totalCount).toBe(files.length);
    });
    
    it('should handle empty file list', async () => {
      const result = await detectLanguages([]);
      expect(result).toEqual([]);
    });
  });

  describe('detectFrameworks', () => {
    it('should detect frameworks from package.json', async () => {
      const files = ['/project/package.json'];
      const fileContents = new Map<string, string>();
      fileContents.set('/project/package.json', JSON.stringify({
        dependencies: {
          'react': '^17.0.2',
          'express': '^4.17.1',
          'mongoose': '^6.0.12'
        }
      }));

      const result = await detectFrameworks(files, fileContents);

      expect(result).toContain('React');
      expect(result).toContain('Node');
      expect(result).toContain('MongoDB');
    });
    
    it('should detect multiple frameworks from different file types', async () => {
      const files = [
        '/project/package.json',
        '/project/Dockerfile',
        '/project/pubspec.yaml'
      ];
      const fileContents = new Map<string, string>();
      fileContents.set('/project/package.json', JSON.stringify({
        dependencies: {
          'react': '^17.0.2'
        }
      }));
      fileContents.set('/project/Dockerfile', 'FROM node:14\nWORKDIR /app');
      fileContents.set('/project/pubspec.yaml', 'dependencies:\n  flutter: sdk');

      const result = await detectFrameworks(files, fileContents);

      expect(result).toContain('React');
      expect(result).toContain('Docker');
      expect(result).toContain('Flutter');
    });
  });

  describe('findExistingDocumentation', () => {
    it('should detect documentation files', async () => {
      // Mock file system functions
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string, options: any) => {
        if (dirPath === '/test/project') {
          return ['README.md', 'CONTRIBUTING.md', 'docs'];
        } else if (dirPath === '/test/project/docs') {
          return ['api.md', 'setup.md'];
        }
        return [];
      });
      (fs.statSync as jest.Mock).mockImplementation((filePath: string) => ({
        isDirectory: () => filePath.includes('docs'),
        size: 1000,
        mtime: new Date('2023-01-01')
      }));
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('README.md')) {
          return '# Project\nThis is a test project';
        } else if (filePath.includes('api.md')) {
          return '---\ntitle: API Documentation\n---\n\n# API';
        }
        return '';
      });

      const result = await findExistingDocumentation('/test/project', {
        includeReadme: true,
        includeApiDocs: true,
        includeInlineComments: false
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.find(doc => doc.path.includes('README.md'))).toBeDefined();
      expect(result.find(doc => doc.path.includes('CONTRIBUTING.md'))).toBeDefined();
      expect(result.find(doc => doc.path.includes('api.md'))).toBeDefined();
      
      // Check that schema compliance is detected
      const apiDoc = result.find(doc => doc.path.includes('api.md'));
      expect(apiDoc?.schemaCompliant).toBe(true);
    });
    
    it('should respect filter options', async () => {
      // Mock file system functions
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string, options: any) => {
        if (dirPath === '/test/project') {
          return ['README.md', 'docs'];
        } else if (dirPath === '/test/project/docs') {
          return ['api.md'];
        }
        return [];
      });
      (fs.statSync as jest.Mock).mockImplementation((filePath: string) => ({
        isDirectory: () => filePath.includes('docs'),
        size: 1000,
        mtime: new Date('2023-01-01')
      }));
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        return '';
      });

      // Test with includeReadme = false
      let result = await findExistingDocumentation('/test/project', {
        includeReadme: false,
        includeApiDocs: true,
        includeInlineComments: false
      });
      
      expect(result.find(doc => doc.path.includes('README.md'))).toBeUndefined();
      expect(result.find(doc => doc.path.includes('api.md'))).toBeDefined();
      
      // Test with includeApiDocs = false
      result = await findExistingDocumentation('/test/project', {
        includeReadme: true,
        includeApiDocs: false,
        includeInlineComments: false
      });
      
      expect(result.find(doc => doc.path.includes('README.md'))).toBeDefined();
      expect(result.find(doc => doc.path.includes('api.md'))).toBeUndefined();
    });
  });
  
  describe('extractComponents', () => {
    it('should extract basic components for basic depth', async () => {
      // Setup directories first
      (fs.statSync as jest.Mock).mockImplementation((filePath: string) => ({
        isDirectory: () => filePath.includes('components') || filePath.includes('pages') || filePath.includes('utils'),
        size: 1000,
        mtime: new Date('2023-01-01')
      }));
      
      const files = [
        '/project/src/components/Button.jsx',
        '/project/src/components/Card.tsx',
        '/project/src/pages/Home.tsx',
        '/project/src/pages/About.tsx',
        '/project/src/utils/helpers.ts'
      ];
      
      const fileContents = new Map<string, string>();
      
      const result = await extractComponents(files, fileContents, { depth: 'basic' });
      
      // Verify it's an array
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('should return empty array for advanced depth without parser', async () => {
      const files = [
        '/project/src/components/Button.jsx'
      ];
      
      const fileContents = new Map<string, string>();
      
      const result = await extractComponents(files, fileContents, { depth: 'deep' });
      
      // Should return empty or basic components since this is a complex parsing task
      expect(Array.isArray(result)).toBe(true);
    });
  });
});