/**
 * Tests for configuration utility
 */
import path from 'path';
import fs from 'fs';
import * as config from '../src/utils/config';

// Mock environment variables
const originalEnv = process.env;
const mockCwd = jest.fn();

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

describe('Configuration Utility', () => {
  // Save original process.env and process.cwd
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.cwd = mockCwd.mockReturnValue('/mock/cwd');
    jest.clearAllMocks();
  });

  // Restore original process.env and process.cwd after tests
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return environment variable value when defined', () => {
      // Setup
      process.env.TEST_KEY = 'test-value';
      
      // Execute
      const value = config.getConfig<string>('TEST_KEY', 'default');
      
      // Verify
      expect(value).toBe('test-value');
    });

    it('should return default value when environment variable is not defined', () => {
      // Setup
      delete process.env.TEST_KEY;
      
      // Execute
      const value = config.getConfig<string>('TEST_KEY', 'default');
      
      // Verify
      expect(value).toBe('default');
    });

    it('should throw error when required environment variable is not defined and no default is provided', () => {
      // Setup
      delete process.env.TEST_KEY;
      
      // Execute & Verify
      expect(() => config.getConfig<string>('TEST_KEY')).toThrow();
    });

    it('should convert string to number when default is a number', () => {
      // Setup
      process.env.TEST_NUMBER = '42';
      
      // Execute
      const value = config.getConfig<number>('TEST_NUMBER', 0);
      
      // Verify
      expect(value).toBe(42);
      expect(typeof value).toBe('number');
    });

    it('should convert string to boolean when default is a boolean', () => {
      // Setup
      process.env.TEST_BOOL_TRUE = 'true';
      process.env.TEST_BOOL_FALSE = 'false';
      
      // Execute
      const trueValue = config.getConfig<boolean>('TEST_BOOL_TRUE', false);
      const falseValue = config.getConfig<boolean>('TEST_BOOL_FALSE', true);
      
      // Verify
      expect(trueValue).toBe(true);
      expect(falseValue).toBe(false);
      expect(typeof trueValue).toBe('boolean');
      expect(typeof falseValue).toBe('boolean');
    });
  });

  describe('Directory and file path getters', () => {
    it('should return template directory path', () => {
      // Setup
      process.env.TEMPLATE_DIR = '/custom/templates';
      
      // Execute
      const templateDir = config.getTemplateDir();
      
      // Verify
      expect(templateDir).toBe('/custom/templates');
    });

    it('should return default template directory path when not defined in env', () => {
      // Setup
      delete process.env.TEMPLATE_DIR;
      
      // Execute
      const templateDir = config.getTemplateDir();
      
      // Verify
      expect(templateDir).toBe(path.join('/mock/cwd', 'docs/_templates'));
    });

    it('should return output directory path', () => {
      // Setup
      process.env.OUTPUT_DIR = '/custom/output';
      
      // Execute
      const outputDir = config.getOutputDir();
      
      // Verify
      expect(outputDir).toBe('/custom/output');
    });

    it('should return log level', () => {
      // Setup
      process.env.LOG_LEVEL = 'debug';
      
      // Execute
      const logLevel = config.getLogLevel();
      
      // Verify
      expect(logLevel).toBe('debug');
    });
  });

  describe('Feature flags', () => {
    it('should check if AI enhancement is enabled', () => {
      // Setup
      process.env.ENABLE_AI_ENHANCEMENT = 'false';
      
      // Execute
      const isEnabled = config.isAIEnhancementEnabled();
      
      // Verify
      expect(isEnabled).toBe(false);
    });

    it('should check if advanced validation is enabled', () => {
      // Setup
      process.env.ENABLE_ADVANCED_VALIDATION = 'true';
      
      // Execute
      const isEnabled = config.isAdvancedValidationEnabled();
      
      // Verify
      expect(isEnabled).toBe(true);
    });
  });

  describe('LLM configuration', () => {
    it('should get LLM configuration', () => {
      // Setup
      process.env.LLM_MODEL = 'test-model';
      process.env.LLM_MAX_TOKENS = '2000';
      process.env.LLM_TEMPERATURE = '0.5';
      
      // Execute
      const llmConfig = config.getLLMConfig();
      
      // Verify
      expect(llmConfig.model).toBe('test-model');
      expect(llmConfig.maxTokens).toBe(2000);
      expect(llmConfig.temperature).toBe(0.5);
    });

    it('should check if LLM is available', () => {
      // Setup
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      // Execute
      const isAvailable = config.isLLMAvailable();
      
      // Verify
      expect(isAvailable).toBe(true);
    });

    it('should return false if LLM is not available', () => {
      // Setup
      delete process.env.ANTHROPIC_API_KEY;
      
      // Execute
      const isAvailable = config.isLLMAvailable();
      
      // Verify
      expect(isAvailable).toBe(false);
    });
  });

  describe('ensureDirectoriesExist', () => {
    it('should create directories if they do not exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      config.ensureDirectoriesExist();
      
      // Verify
      expect(fs.mkdirSync).toHaveBeenCalledTimes(4);
    });

    it('should not create directories if they already exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Execute
      config.ensureDirectoriesExist();
      
      // Verify
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});