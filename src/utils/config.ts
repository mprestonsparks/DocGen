/**
 * Configuration utility for DocGen
 */
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { LLMConfig, LLMProvider, LLMProviderConfigs } from '@core/types/llm';
import { LogLevel } from '@core/types/logging';
import { ExistingProjectOptions } from '@core/types/project';

// Load environment variables if not already loaded
if (!process.env.NODE_ENV) {
  require('dotenv').config();
}

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

const defaultProviderConfigs: LLMProviderConfigs = {
  anthropic: {
    model: 'claude-2',
    maxTokens: 2000,
    temperature: 0.7,
  },
  openai: {
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.7,
  },
  cohere: {
    model: 'command',
    maxTokens: 2000,
    temperature: 0.7,
  },
  fallback: {
    model: 'fallback',
    maxTokens: 2000,
    temperature: 0.7,
  }
};

/**
 * Get the LLM configuration
 */
export const getLLMConfig = (): LLMConfig => {
  const availableProvider = ['anthropic', 'openai', 'cohere'].find(p => 
    isProviderAvailable(p as LLMProvider)
  ) as LLMProvider || 'fallback';

  return {
    provider: availableProvider,
    maxTokens: 2000,
    temperature: 0.7,
    providerConfigs: defaultProviderConfigs
  };
};

/**
 * Check if a specific LLM provider is available
 */
const isProviderAvailable = (provider: LLMProvider): boolean => {
  const apiKey = getLLMApiKey(provider);
  return apiKey !== undefined && apiKey.length > 0;
};

/**
 * Get the LLM API key for a provider
 */
export const getLLMApiKey = (provider: LLMProvider): string | undefined => {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'cohere':
      return process.env.COHERE_API_KEY;
    case 'fallback':
      return undefined;
  }
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
 * Get the log level
 */
export const getLogLevel = (): string => {
  return process.env.LOG_LEVEL || 'info';
};

/**
 * Get the log file path
 */
export const getLogFilePath = (): string => {
  return process.env.LOG_FILE_PATH || 'logs/docgen.log';
};

/**
 * Check if any LLM API is available
 */
export const isLLMApiAvailable = (): boolean => {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.COHERE_API_KEY
  );
};

/**
 * Get the Anthropic API key
 */
export const getAnthropicApiKey = (): string => {
  return getConfig<string>('ANTHROPIC_API_KEY');
};

/**
 * Check if the LLM is available (any provider is available)
 */
export const isLLMAvailable = (): boolean => {
  const config = getLLMConfig();
  const providers = Object.keys(config.providerConfigs);
  
  // Check if any provider is available
  return providers.some(provider => isProviderAvailable(provider as LLMProvider));
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

/**
 * Get the default configuration for existing project analysis
 */
export const getExistingProjectDefaults = (): ExistingProjectOptions => {
  const configPath = path.join(process.cwd(), 'config/existing-project.yaml');
  
  // Create default config file if it doesn't exist
  if (!fs.existsSync(configPath)) {
    createDefaultExistingProjectConfig(configPath);
  }
  
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as any;
    
    return {
      projectRoot: process.cwd(),
      path: '',
      analysisDepth: config.analysis?.depth ? Number(config.analysis.depth) : 1,
      outputDirectory: config.output?.directory || 'docgen-output',
      preserveExisting: true,
      generateIntegrationGuide: config.integration?.generateGuide !== false
    };
  } catch (error) {
    console.warn(`Error loading existing project config: ${error}`);
    
    // Return default configuration
    return {
      projectRoot: process.cwd(),
      path: '',
      analysisDepth: 1,
      outputDirectory: 'docgen-output',
      preserveExisting: true,
      generateIntegrationGuide: true
    };
  }
};

/**
 * Create the default configuration file for existing project analysis
 */
function createDefaultExistingProjectConfig(configPath: string): void {
  const defaultConfig = `
analysis:
  depth: 1  # 1 = basic, 2 = standard, 3 = deep
  includeDotFiles: false
  maxFileSize: 10485760  # 10MB
  includeNodeModules: false
  
output:
  directory: "docgen-output"
  createSubdirectories: true
  subdirectoryTemplate: "{documentType}/"
  
integration:
  generateGuide: true
  suggestMergeStrategy: true
  
validation:
  validateExistingDocs: true
  reportNonCompliance: true
  attemptFixes: false
`;

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, defaultConfig, 'utf8');
  console.log(`Created default existing project configuration at ${configPath}`);
}

/**
 * Get the existing project output directory path
 */
export const getExistingProjectOutputDir = (projectPath: string, outputDirectory?: string): string => {
  const defaults = getExistingProjectDefaults();
  const outputDir = outputDirectory || defaults.outputDirectory || 'docgen-output';
  
  // If path is absolute, use it directly
  if (path.isAbsolute(outputDir)) {
    return outputDir;
  }
  
  // Otherwise, create the path relative to the project directory
  return path.join(projectPath, outputDir);
};

// Ensure that required directories exist on import
ensureDirectoriesExist();