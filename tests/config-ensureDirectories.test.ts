/**
 * Tests for the directory management functions in config.ts
 */
import fs from 'fs';
import path from 'path';
import * as config from '../src/utils/config';

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('Directory management functions', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd;
  
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.cwd = jest.fn().mockReturnValue('/test/cwd');
  });

  afterAll(() => {
    process.env = originalEnv;
    process.cwd = originalCwd;
  });

  describe('ensureDirectoriesExist', () => {
    it('should create directories if they do not exist', () => {
      // Mock directories don't exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      config.ensureDirectoriesExist();
      
      // Should check existence of template dir, output dir, session storage, and log dir
      expect(fs.existsSync).toHaveBeenCalledTimes(4);
      
      // Should create directories
      expect(fs.mkdirSync).toHaveBeenCalledTimes(4);
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
    
    it('should not create directories if they already exist', () => {
      // Mock directories already exist
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      config.ensureDirectoriesExist();
      
      // Should check existence of directories
      expect(fs.existsSync).toHaveBeenCalledTimes(4);
      
      // Should not create any directories
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
  
  describe('getExistingProjectDefaults', () => {
    it('should create default config file if it does not exist', () => {
      // Mock config file doesn't exist, then exists for the read
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false)  // First check if file exists
        .mockReturnValueOnce(true);  // Check if directory exists (doesn't need to create)
      
      // Mock read file to return valid YAML
      (fs.readFileSync as jest.Mock).mockReturnValue(`
        analysis:
          depth: "basic"
        output:
          directory: "custom-output"
        integration:
          generateGuide: false
      `);
      
      const result = config.getExistingProjectDefaults();
      
      // Should check if file exists
      expect(fs.existsSync).toHaveBeenCalledWith('/test/cwd/config/existing-project.yaml');
      
      // Should create default config
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/test/cwd/config/existing-project.yaml',
        expect.stringContaining('analysis:'),
        'utf8'
      );
      
      // Should return parsed config
      expect(result).toEqual({
        path: '',
        analysisDepth: 'basic',
        outputDirectory: 'custom-output',
        preserveExisting: true,
        generateIntegrationGuide: false
      });
    });
    
    it('should handle file read errors and return defaults', () => {
      // Mock config file exists
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock read file to throw error
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const result = config.getExistingProjectDefaults();
      
      // Should return default values
      expect(result).toEqual({
        path: '',
        analysisDepth: 'standard',
        outputDirectory: 'docgen-output',
        preserveExisting: true,
        generateIntegrationGuide: true
      });
    });
  });
  
  describe('getExistingProjectOutputDir', () => {
    it('should return absolute path if provided', () => {
      // Mock absolute output path
      const result = config.getExistingProjectOutputDir('/project', '/absolute/output/dir');
      
      expect(result).toBe('/absolute/output/dir');
    });
    
    it('should return path relative to project path', () => {
      // Mock relative output path
      const result = config.getExistingProjectOutputDir('/project', 'relative/output/dir');
      
      expect(result).toBe('/project/relative/output/dir');
    });
    
    it('should use default output directory if not specified', () => {
      // Mock getExistingProjectDefaults to return custom defaults
      jest.spyOn(config, 'getExistingProjectDefaults').mockReturnValue({
        path: '',
        analysisDepth: 'standard',
        outputDirectory: 'custom-default-dir',
        preserveExisting: true,
        generateIntegrationGuide: true
      });
      
      const result = config.getExistingProjectOutputDir('/project');
      
      expect(result).toBe('/project/custom-default-dir');
    });
  });
});