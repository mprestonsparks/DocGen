/**
 * Configuration utility for DocGen
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { LLMConfig, LogLevel } from '../types';

// Load environment variables
dotenv.config();

/**
 * Get a configuration value from the environment,
 * with an optional default value if not found
 * 
 * @param key The environment variable key
 * @param defaultValue The default value if not found
 * @returns The configuration value
 */
export const getConfig = <T>(key: string, defaultValue?: T): T => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Required environment variable ${key} is not defined`);
    }
    return defaultValue;
  }
  
  // Handle different types based on the defaultValue
  if (typeof defaultValue === 'number') {
    return Number(value) as unknown as T;
  } else if (typeof defaultValue === 'boolean') {
    return (value.toLowerCase() === 'true') as unknown as T;
  }
  
  return value as unknown as T;
};

/**
 * Get the template directory path
 */
export const getTemplateDir = (): string => {
  return getConfig<string>('TEMPLATE_DIR', path.join(process.cwd(), 'docs/_templates'));
};

/**
 * Get the output directory path
 */
export const getOutputDir = (): string => {
  return getConfig<string>('OUTPUT_DIR', path.join(process.cwd(), 'docs/generated'));
};

/**
 * Get the session storage path
 */
export const getSessionStoragePath = (): string => {
  return getConfig<string>('SESSION_STORAGE_PATH', path.join(process.cwd(), '.sessions'));
};

/**
 * Get the log file path
 */
export const getLogFilePath = (): string => {
  return getConfig<string>('LOG_FILE', path.join(process.cwd(), 'logs/docgen.log'));
};

/**
 * Get the log level
 */
export const getLogLevel = (): LogLevel => {
  return getConfig<LogLevel>('LOG_LEVEL', 'info');
};

/**
 * Check if AI enhancement is enabled
 */
export const isAIEnhancementEnabled = (): boolean => {
  return getConfig<boolean>('ENABLE_AI_ENHANCEMENT', true);
};

/**
 * Check if advanced validation is enabled
 */
export const isAdvancedValidationEnabled = (): boolean => {
  return getConfig<boolean>('ENABLE_ADVANCED_VALIDATION', true);
};

/**
 * Get the LLM configuration
 */
export const getLLMConfig = (): LLMConfig => {
  return {
    provider: 'anthropic',
    model: getConfig<string>('LLM_MODEL', 'claude-3-5-sonnet-20240620'),
    maxTokens: getConfig<number>('LLM_MAX_TOKENS', 4000),
    temperature: getConfig<number>('LLM_TEMPERATURE', 0.7)
  };
};

/**
 * Get the Anthropic API key
 */
export const getAnthropicApiKey = (): string => {
  return getConfig<string>('ANTHROPIC_API_KEY');
};

/**
 * Check if the LLM is available (API key is set)
 */
export const isLLMAvailable = (): boolean => {
  try {
    getAnthropicApiKey();
    return true;
  } catch {
    return false;
  }
};

/**
 * Ensure that required directories exist
 */
export const ensureDirectoriesExist = (): void => {
  const directories = [
    getTemplateDir(),
    getOutputDir(),
    getSessionStoragePath(),
    path.dirname(getLogFilePath())
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Ensure that required directories exist on import
ensureDirectoriesExist();