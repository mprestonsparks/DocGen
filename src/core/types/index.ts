/**
 * Core type definitions for DocGen
 * 
 * This file contains the base types shared across all modules
 */

/**
 * Project type matrix
 */
export enum ProjectType {
  NEW_STANDARD = 'new-standard',
  NEW_PAPER = 'new-paper',
  EXISTING_STANDARD = 'existing-standard',
  EXISTING_PAPER = 'existing-paper'
}

/**
 * Base project options shared by all project types
 */
export interface BaseProjectOptions {
  outputDirectory: string;
  preserveExisting: boolean;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * LLM provider types
 */
export type LLMProvider = 'anthropic' | 'openai' | 'cohere';

/**
 * LLM configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  endpointUrl?: string;
  timeout?: number;
}

/**
 * LLM response interface
 */
export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Project detection result
 */
export interface ProjectDetectionResult {
  type: ProjectType;
  confidence: number;
  framework?: string;
  language?: string;
}

/**
 * Options for project analysis
 */
export interface AnalysisOptions {
  analysisDepth: 'basic' | 'standard' | 'deep';
  includeDotFiles: boolean;
  maxFileSize: number;
  includeNodeModules: boolean;
}

/**
 * Result of project analysis
 */
export interface ProjectAnalysisResult {
  detectedType: string;
  languages: Array<{ name: string; percentage: number; files: number }>;
  frameworks: string[];
  buildTools: string[];
  detectedComponents: Array<{
    name: string;
    path: string;
    type: string;
    relationships: Array<{
      targetComponent: string;
      relationType: 'imports' | 'extends' | 'implements' | 'uses';
    }>;
  }>;
  existingDocumentation: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>;
  repositoryInfo?: {
    type: string;
    remoteUrl?: string;
    branch?: string;
  };
}

/**
 * Documentation options
 */
export interface DocumentationOptions {
  format: 'markdown' | 'html' | 'pdf';
  templatePath?: string;
  includeOverview: boolean;
  includeArchitecture: boolean;
  includeApi: boolean;
  includeDevelopment: boolean;
  includeUserGuide: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  location: string;
  severity: 'error';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  location: string;
  severity: 'warning';
}

/**
 * Error types
 */
export enum ErrorType {
  CONFIGURATION = 'configuration',
  VALIDATION = 'validation',
  EXECUTION = 'execution',
  NETWORK = 'network',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}
