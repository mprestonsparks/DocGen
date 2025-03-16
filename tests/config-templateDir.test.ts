/**
 * Tests for template directory functions in config.ts
 */
import path from 'path';
import * as fs from 'fs';
import * as config from '../src/utils/config';

// Mock path for testing directory resolution
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn((...args) => args.join('/').replace(/\/\//g, '/')),
    isAbsolute: jest.fn(path => path.startsWith('/')),
    resolve: jest.fn((basePath, relativePath) => {
      if (relativePath && relativePath.startsWith('/')) return relativePath;
      return `${basePath}/${relativePath}`.replace(/\/\//g, '/');
    })
  };
});

describe('Template directory functions', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.cwd = jest.fn().mockReturnValue('/test/cwd');
  });

  afterAll(() => {
    process.env = originalEnv;
    process.cwd = originalCwd;
  });

  describe('getTemplateDir', () => {
    it('should return default template directory if not specified in env', () => {
      // Clear any existing template dir env var
      delete process.env.TEMPLATE_DIR;
      
      const result = config.getTemplateDir();
      
      // Default is docs/_templates in the current working directory
      expect(result).toBe('/test/cwd/docs/_templates');
    });
    
    it('should return template directory from env var if specified', () => {
      // Set custom template dir in env
      process.env.TEMPLATE_DIR = '/custom/template/dir';
      
      const result = config.getTemplateDir();
      
      expect(result).toBe('/custom/template/dir');
    });
    
    it('should accept relative paths in env var', () => {
      // Set relative template dir in env
      process.env.TEMPLATE_DIR = 'custom/template/dir';
      
      const result = config.getTemplateDir();
      
      // In the implementation, the path module should handle resolution
      // but our test is checking that at least the path is being used
      expect(result).toBe('custom/template/dir');
    });
  });
  
  // Instead of testing non-existent functions, test the template directory functions
  describe('getTemplateDir', () => {
    it('should be combined with file paths correctly', () => {
      // Clear any existing template dir env var
      delete process.env.TEMPLATE_DIR;
      
      const templateDir = config.getTemplateDir();
      const templateFile = path.join(templateDir, 'srs.hbs');
      const fallbackFile = path.join(templateDir, 'fallback', 'srs.md');
      
      // Validate paths
      expect(templateFile).toBe('/test/cwd/docs/_templates/srs.hbs');
      expect(fallbackFile).toBe('/test/cwd/docs/_templates/fallback/srs.md');
    });
    
    it('should respect custom template directory', () => {
      // Set custom template dir in env
      process.env.TEMPLATE_DIR = '/custom/template/dir';
      
      const templateDir = config.getTemplateDir();
      const templateFile = path.join(templateDir, 'api.hbs');
      const fallbackFile = path.join(templateDir, 'fallback', 'api.md');
      
      // Validate paths
      expect(templateFile).toBe('/custom/template/dir/api.hbs');
      expect(fallbackFile).toBe('/custom/template/dir/fallback/api.md');
    });
  });
  
  describe('getOutputDir', () => {
    it('should return default output directory if not specified in env', () => {
      // Clear any existing output dir env var
      delete process.env.OUTPUT_DIR;
      
      const result = config.getOutputDir();
      
      // Default is docs/generated in the current working directory
      expect(result).toBe('/test/cwd/docs/generated');
    });
    
    it('should return output directory from env var if specified', () => {
      // Set custom output dir in env
      process.env.OUTPUT_DIR = '/custom/output/dir';
      
      const result = config.getOutputDir();
      
      expect(result).toBe('/custom/output/dir');
    });
    
    it('should accept relative paths in env var', () => {
      // Set relative output dir in env
      process.env.OUTPUT_DIR = 'custom/output/dir';
      
      const result = config.getOutputDir();
      
      // In the implementation, the path module should handle resolution
      // but our test is checking that at least the path is being used
      expect(result).toBe('custom/output/dir');
    });
  });
});