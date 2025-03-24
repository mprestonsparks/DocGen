/**
 * Tests for logging and session related functions in config.ts
 */
import path from 'path';
import * as config from '../src/utils/config';
import { LogLevel } from '../src/types';

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

describe('Logging and session functions', () => {
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

  describe('getLogLevel', () => {
    it('should return default log level if not specified in env', () => {
      // Clear any existing log level env var
      delete process.env.LOG_LEVEL;
      
      const result = config.getLogLevel();
      
      // Default is 'info'
      expect(result).toBe('info');
    });
    
    it('should return log level from env var if specified', () => {
      // Test various valid log levels
      const logLevels: LogLevel[] = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
      
      for (const level of logLevels) {
        process.env.LOG_LEVEL = level;
        const result = config.getLogLevel();
        expect(result).toBe(level);
      }
    });
    
    it('should accept any log level string', () => {
      // In the current implementation, getLogLevel does not validate the log level
      process.env.LOG_LEVEL = 'invalid_level' as any;
      
      const result = config.getLogLevel();
      
      // Returns whatever is in the environment
      expect(result).toBe('invalid_level');
    });
  });
  
  describe('getLogFilePath', () => {
    it('should return default log file path if not specified in env', () => {
      // Clear any existing log file path env var
      delete process.env.LOG_FILE;
      
      const result = config.getLogFilePath();
      
      // Default is logs/docgen.log in the current working directory
      expect(result).toBe('/test/cwd/logs/docgen.log');
    });
    
    it('should return log file path from env var if specified', () => {
      // Set custom log file path in env
      process.env.LOG_FILE = '/custom/logs/app.log';
      
      const result = config.getLogFilePath();
      
      expect(result).toBe('/custom/logs/app.log');
    });
    
    it('should accept relative paths in env var', () => {
      // Set relative log file path in env
      process.env.LOG_FILE = 'custom/logs/app.log';
      
      const result = config.getLogFilePath();
      
      // In the implementation, the path module should handle resolution
      // but our test is checking that at least the path is being used
      expect(result).toBe('custom/logs/app.log');
    });
  });
  
  describe('getSessionStoragePath', () => {
    it('should return default session storage path if not specified in env', () => {
      // Clear any existing session storage path env var
      delete process.env.SESSION_STORAGE_PATH;
      
      const result = config.getSessionStoragePath();
      
      // Default is .sessions in the current working directory
      expect(result).toBe('/test/cwd/.sessions');
    });
    
    it('should return session storage path from env var if specified', () => {
      // Set custom session storage path in env
      process.env.SESSION_STORAGE_PATH = '/custom/sessions';
      
      const result = config.getSessionStoragePath();
      
      expect(result).toBe('/custom/sessions');
    });
    
    it('should accept relative paths in env var', () => {
      // Set relative session storage path in env
      process.env.SESSION_STORAGE_PATH = 'custom/sessions';
      
      const result = config.getSessionStoragePath();
      
      // In the implementation, the path module should handle resolution
      // but our test is checking that at least the path is being used
      expect(result).toBe('custom/sessions');
    });
  });
  
  describe('isAIEnhancementEnabled', () => {
    it('should return true by default', () => {
      // Clear env var
      delete process.env.ENABLE_AI_ENHANCEMENT;
      
      const result = config.isAIEnhancementEnabled();
      
      expect(result).toBe(true);
    });
    
    it('should return false when disabled in env', () => {
      // Disable AI enhancement
      process.env.ENABLE_AI_ENHANCEMENT = 'false';
      
      const result = config.isAIEnhancementEnabled();
      
      expect(result).toBe(false);
    });
  });
  
  describe('isAdvancedValidationEnabled', () => {
    it('should return true by default', () => {
      // Clear env var
      delete process.env.ENABLE_ADVANCED_VALIDATION;
      
      const result = config.isAdvancedValidationEnabled();
      
      expect(result).toBe(true);
    });
    
    it('should return false when disabled in env', () => {
      // Disable advanced validation
      process.env.ENABLE_ADVANCED_VALIDATION = 'false';
      
      const result = config.isAdvancedValidationEnabled();
      
      expect(result).toBe(false);
    });
  });
});