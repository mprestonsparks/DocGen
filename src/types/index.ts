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
  schemaVersion?: string; // Added to capture and verify schema version
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  location: string;
  severity: 'error';
  element?: string; // For referencing specific document elements
  documentId?: string; // For traceability
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  location: string;
  severity: 'warning';
  element?: string; // For referencing specific document elements
  documentId?: string; // For traceability
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
 * Schema versions for different document types
 * As per documentation standards, current version is 1.1.0
 */
export interface SchemaVersions {
  prd: string;
  srs: string;
  sad: string;
  sdd: string;
  stp: string;
  [key: string]: string; // Allow additional document types
}

/**
 * Document metadata structure for YAML frontmatter
 */
export interface DocumentMetadata {
  schemaVersion: string; // Must be 1.1.0 for current documents
  id: string; // Unique identifier for traceability
  title: string;
  version: string;
  status: string;
  date: string;
  author: string;
  reviewedBy?: string;
  approvedBy?: string;
  tags?: string[];
}

/**
 * Project defaults
 */
export interface ProjectDefaults {
  schema_versions: SchemaVersions;
  document_versions: Record<string, string>;
  document_statuses: string[];
  project_types: Record<string, { recommended_docs: string[] }>;
}

/**
 * Logger levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

/**
 * Relationship types for document traceability
 */
export type RelationshipType = 'IMPLEMENTS' | 'DEPENDS_ON' | 'REFINES' | 'VERIFIES' | 'DERIVED_FROM' | 'SATISFIES' | 'CONFLICTS_WITH';

/**
 * Document relationship for traceability
 */
export interface DocumentRelationship {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description?: string;
  timestamp: string; // ISO format date when relationship was created/updated
}

/**
 * Change tracking element for version control at element level
 */
export interface ElementChange {
  elementId: string;
  timestamp: string;
  author: string;
  description: string;
  previousValue?: string;
  newValue: string;
}

/**
 * Template data for document generation
 */
export interface TemplateData {
  schemaVersion: string; // Must be 1.1.0 per documentation standards
  documentVersion: string;
  lastUpdated: string;
  status: string;
  projectId: string;
  projectName: string;
  projectDescription: string;
  authorId: string;
  visionStatement: string;
  targetAudience: string[];
  systemScope: {
    includes: string[];
    excludes: string[];
  };
  definitions: Array<{
    id: string;
    term: string;
    definition: string;
    context: string;
  }>;
  references: Array<{
    id: string;
    title: string;
    source: string;
    version: string;
    url: string;
  }>;
  objectives: Array<{
    description: string;
    target: string;
    measurement: string;
  }>;
  challenges: Array<{
    description: string;
    impact: string;
    stakeholders: string[];
  }>;
  components: Array<{
    name: string;
    purpose: string;
    features: string[];
    responsibilities: string[];
    dependencies: string[];
    requirementsImplemented: string[];
    classes?: Array<{
      name: string;
      purpose: string;
      properties: Array<{
        name: string;
        type: string;
      }>;
      methods: Array<{
        name: string;
      }>;
    }>;
    interfaces?: Array<{
      name: string;
      methods: Array<{
        returnType: string;
        name: string;
        parameters: Array<{
          type: string;
          name: string;
        }>;
      }>;
    }>;
  }>;
  technologies: Array<{
    name: string;
    category: string;
    purpose: string;
  }>;
  [key: string]: any;
}

/**
 * Document generation options
 */
export interface DocumentGenerationOptions {
  templatePath?: string;
  outputPath?: string;
  enhanceWithLLM?: boolean;
  [key: string]: any;
}