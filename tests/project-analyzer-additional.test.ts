/**
 * Additional tests for project-analyzer.ts to improve coverage
 */
import fs from 'fs';
import path from 'path';
import * as projectAnalyzer from '../src/utils/project-analyzer';
import * as testables from '../src/utils/project-analyzer-testables';

// Mock fs and path
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn()
}));

jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn().mockImplementation((...args) => args.join('/')),
    dirname: jest.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/')),
    basename: jest.fn().mockImplementation((p) => p.split('/').slice(-1)[0]),
    resolve: jest.fn().mockImplementation((...args) => args.join('/')),
    extname: jest.fn().mockImplementation(originalPath.extname)
  };
});

// Mock logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('ProjectAnalyzer - Additional Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('hasYamlFrontmatter', () => {
    it('should detect YAML frontmatter in content', () => {
      const contentWithFrontmatter = '---\ntitle: Test\n---\n\nContent';
      const contentWithoutFrontmatter = 'No frontmatter here';
      
      expect(testables.hasYamlFrontmatter(contentWithFrontmatter)).toBe(true);
      expect(testables.hasYamlFrontmatter(contentWithoutFrontmatter)).toBe(false);
    });
    
    it('should handle edge cases', () => {
      expect(testables.hasYamlFrontmatter('')).toBe(false);
      expect(testables.hasYamlFrontmatter('--\nNot valid frontmatter\n--')).toBe(false);
      expect(testables.hasYamlFrontmatter('---\nIncomplete frontmatter')).toBe(false);
    });
  });
  
  // The determineType function doesn't appear to be in testables, skipping this test.
  
  describe('detectBuildTools', () => {
    it('should detect various build tools', async () => {
      // Create mock files and their contents
      const files = [
        '/test/project/package.json',
        '/test/project/tsconfig.json'
      ];
      
      const fileContents = new Map<string, string>();
      fileContents.set('/test/project/package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'webpack': '^5.0.0',
          'typescript': '^4.0.0'
        }
      }));
      fileContents.set('/test/project/tsconfig.json', '{ "compilerOptions": {} }');
      
      const tools = await testables.detectBuildTools(files, fileContents);
      
      expect(tools).toContain('npm');
      expect(tools).toContain('webpack');
      expect(tools).toContain('typescript');
      
      // Test with different build tools
      const files2 = [
        '/test/project/pom.xml',
        '/test/project/Makefile'
      ];
      
      const fileContents2 = new Map<string, string>();
      fileContents2.set('/test/project/pom.xml', '<project></project>');
      fileContents2.set('/test/project/Makefile', 'all: build');
      
      const tools2 = await testables.detectBuildTools(files2, fileContents2);
      
      expect(tools2).toContain('Maven');
      expect(tools2).toContain('Make');
      expect(tools2).not.toContain('npm');
    });
  });
  
  describe('determineProjectType', () => {
    it('should determine project type based on languages and frameworks', () => {
      // Test mobile project
      const mobileLanguages = [
        { name: 'Swift', percentage: 80, files: 10 },
        { name: 'Objective-C', percentage: 20, files: 2 }
      ];
      const mobileFrameworks = ['ReactNative', 'SwiftUI'];
      const mobileContents = new Map<string, string>();
      
      const mobileType = testables.determineProjectType(mobileLanguages, mobileFrameworks, mobileContents);
      expect(mobileType).toBe('MOBILE');
      
      // Test web project
      const webLanguages = [
        { name: 'JavaScript', percentage: 70, files: 20 },
        { name: 'CSS', percentage: 20, files: 5 },
        { name: 'HTML', percentage: 10, files: 3 }
      ];
      const webFrameworks = ['React', 'Node'];
      const webContents = new Map<string, string>();
      
      const webType = testables.determineProjectType(webLanguages, webFrameworks, webContents);
      expect(webType).toBe('WEB');
      
      // Test API project
      const apiLanguages = [
        { name: 'JavaScript', percentage: 100, files: 10 }
      ];
      const apiFrameworks: string[] = [];
      const apiContents = new Map<string, string>();
      apiContents.set('api.js', 'This is an API endpoint for REST services');
      
      const apiType = testables.determineProjectType(apiLanguages, apiFrameworks, apiContents);
      expect(apiType).toBe('API');
      
      // Test desktop project
      const desktopLanguages = [
        { name: 'C#', percentage: 90, files: 15 },
        { name: 'XML', percentage: 10, files: 2 }
      ];
      const desktopFrameworks = ['WPF'];
      const desktopContents = new Map<string, string>();
      
      const desktopType = testables.determineProjectType(desktopLanguages, desktopFrameworks, desktopContents);
      expect(desktopType).toBe('DESKTOP');
      
      // Test default case
      const otherLanguages = [
        { name: 'Python', percentage: 100, files: 5 }
      ];
      const otherFrameworks: string[] = [];
      const otherContents = new Map<string, string>();
      
      const otherType = testables.determineProjectType(otherLanguages, otherFrameworks, otherContents);
      expect(otherType).toBe('OTHER');
    });
  });
  
  describe('hasExistingGit', () => {
    it('should detect Git repositories', () => {
      // Mock Git directory exists and is a directory
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.statSync as jest.Mock).mockReturnValueOnce({ isDirectory: () => true });
      
      expect(testables.hasExistingGit('/test/project')).toBe(true);
      
      // Path.join is mocked to join with '/', so check that it was called with correct args
      expect(path.join).toHaveBeenCalledWith('/test/project', '.git');
      
      jest.clearAllMocks();
      
      // Mock Git directory doesn't exist
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      expect(testables.hasExistingGit('/test/project')).toBe(false);
      
      jest.clearAllMocks();
      
      // Mock Git directory exists but is a file, not a directory
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.statSync as jest.Mock).mockReturnValueOnce({ isDirectory: () => false });
      
      expect(testables.hasExistingGit('/test/project')).toBe(false);
    });
  });
});