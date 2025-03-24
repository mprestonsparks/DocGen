/**
 * Tests for the specific utility functions in the config module
 */
import * as config from '../src/utils/config';

describe('Config utilities', () => {
  describe('getConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return string value from environment', () => {
      process.env.TEST_STRING = 'test-value';
      const result = config.getConfig('TEST_STRING', 'default');
      expect(result).toBe('test-value');
    });

    it('should return default string when not in environment', () => {
      delete process.env.TEST_STRING;
      const result = config.getConfig('TEST_STRING', 'default');
      expect(result).toBe('default');
    });

    it('should return number value from environment', () => {
      process.env.TEST_NUMBER = '123';
      const result = config.getConfig('TEST_NUMBER', 0);
      expect(result).toBe(123);
    });

    it('should return boolean value from environment', () => {
      process.env.TEST_BOOL = 'true';
      const result = config.getConfig('TEST_BOOL', false);
      expect(result).toBe(true);

      process.env.TEST_BOOL = 'false';
      const result2 = config.getConfig('TEST_BOOL', true);
      expect(result2).toBe(false);
    });

    it('should throw error when required value is missing', () => {
      delete process.env.REQUIRED_VALUE;
      expect(() => {
        config.getConfig('REQUIRED_VALUE');
      }).toThrow('Required environment variable REQUIRED_VALUE is not defined');
    });
  });

  describe('getLLMConfig', () => {
    it('should return a valid LLM configuration', () => {
      const result = config.getLLMConfig();
      expect(result).toBeDefined();
      expect(result.provider).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.temperature).toBeDefined();
    });
  });

  describe('isAIEnhancementEnabled', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true by default', () => {
      delete process.env.ENABLE_AI_ENHANCEMENT;
      const result = config.isAIEnhancementEnabled();
      expect(result).toBe(true);
    });

    it('should return false when disabled', () => {
      process.env.ENABLE_AI_ENHANCEMENT = 'false';
      const result = config.isAIEnhancementEnabled();
      expect(result).toBe(false);
    });
  });

  describe('isAdvancedValidationEnabled', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true by default', () => {
      delete process.env.ENABLE_ADVANCED_VALIDATION;
      const result = config.isAdvancedValidationEnabled();
      expect(result).toBe(true);
    });

    it('should return false when disabled', () => {
      process.env.ENABLE_ADVANCED_VALIDATION = 'false';
      const result = config.isAdvancedValidationEnabled();
      expect(result).toBe(false);
    });
  });

  describe('isLLMAvailable', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true when API key is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const result = config.isLLMAvailable();
      expect(result).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = config.isLLMAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getLogLevel', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return log level from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      const result = config.getLogLevel();
      expect(result).toBe('debug');
    });

    it('should return default log level when not in environment', () => {
      delete process.env.LOG_LEVEL;
      const result = config.getLogLevel();
      expect(result).toBe('info');
    });
  });
});