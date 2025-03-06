/**
 * Type definitions for DocGen
 */

/**
 * Project information
 */
export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  created: string;
}

/**
 * Project type
 */
export type ProjectType = 'WEB' | 'MOBILE' | 'API' | 'DESKTOP' | 'OTHER';

/**
 * Mobile platform type
 */
export type MobilePlatformType = 'Cross-platform' | 'iOS (Swift)' | 'Android (Kotlin/Java)';

/**
 * Technology stack recommendations
 */
export interface TechStackRecommendations {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  mobile?: string[];
  devops?: string[];
}

/**
 * Selected technology stack
 */
export interface TechStack {
  recommended: string[];
  selected: string[];
}

/**
 * Documentation needs
 */
export interface DocumentationNeeds {
  prd: boolean;
  srs: boolean;
  sad: boolean;
  sdd: boolean;
  stp: boolean;
  additional: string[];
}

/**
 * Interview answers
 */
export interface InterviewAnswers {
  [key: string]: string;
}

/**
 * Session data
 */
export interface SessionData {
  projectInfo?: ProjectInfo;
  techStack?: TechStack;
  documentationNeeds?: DocumentationNeeds;
  interviewAnswers: InterviewAnswers;
  _lastUpdated?: string;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  sessionId: string;
  projectName: string;
  lastUpdated: string;
}

/**
 * LLM provider options
 */
export type LLMProvider = 'anthropic';

/**
 * LLM configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * LLM response
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
 * Document enhancement options 
 */
export interface EnhancementOptions {
  improveFormatting?: boolean;
  addExamples?: boolean;
  expandExplanations?: boolean;
  addReferences?: boolean;
  checkConsistency?: boolean;
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
 * Cross-reference information
 */
export interface CrossReference {
  id: string;
  type: string;
  description: string;
}

/**
 * Project defaults
 */
export interface ProjectDefaults {
  schema_versions: Record<string, string>;
  document_versions: Record<string, string>;
  document_statuses: string[];
  project_types: Record<string, { recommended_docs: string[] }>;
}

/**
 * Logger levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';