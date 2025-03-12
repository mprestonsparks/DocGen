/**
 * Tests for the project analyzer module
 */
import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject, detectLanguages, findExistingDocumentation } from '../src/utils/project-analyzer';
import { ProjectAnalysisResult } from '../src/types';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: (fn: any) => fn,
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
  });
});