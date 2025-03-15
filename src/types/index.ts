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
export type ProjectType = 'WEB' | 'MOBILE' | 'API' | 'DESKTOP' | 'ACADEMIC_PAPER' | 'OTHER';

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
 * Project analysis result
 */
export interface ProjectAnalysisResult {
  detectedType: ProjectType;
  languages: {
    name: string;
    percentage: number;
    files: number;
  }[];
  frameworks: string[];
  buildTools: string[];
  detectedComponents: {
    name: string;
    path: string;
    type: string;
    relationships: Array<{
      targetComponent: string;
      relationType: 'imports' | 'extends' | 'implements' | 'uses';
    }>;
  }[];
  existingDocumentation: {
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }[];
  repositoryInfo?: {
    type: string;
    remoteUrl?: string;
    branch?: string;
  };
}

/**
 * Existing project options
 */
export interface ExistingProjectOptions {
  path: string;
  analysisDepth: 'basic' | 'standard' | 'deep';
  outputDirectory: string;
  preserveExisting: boolean;
  generateIntegrationGuide: boolean;
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
  existingProject?: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  };
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
export type LLMProvider = 'anthropic' | 'openai' | 'cohere' | 'fallback';

/**
 * LLM configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  fallbackProviders?: LLMProvider[];
  timeout?: number;
}

/**
 * Provider-specific configurations
 */
export interface LLMProviderConfigs {
  anthropic?: AnthropicConfig;
  openai?: OpenAIConfig;
  cohere?: CohereConfig;
}

/**
 * Anthropic API configuration
 */
export interface AnthropicConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Cohere API configuration
 */
export interface CohereConfig {
  apiKey?: string;
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
  schemaVersion?: string; // Must be 1.1.0 per documentation standards
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

/**
 * Paper Architect Types
 */

/**
 * Academic paper information
 */
export interface PaperInfo {
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  doi?: string;
  url?: string;
  keywords?: string[];
  venue?: string;
  fileName?: string;
  filePath?: string;
}

/**
 * Extracted paper content structure
 */
export interface PaperContent {
  paperInfo: PaperInfo;
  sections: PaperSection[];
  algorithms: PaperAlgorithm[];
  equations: PaperEquation[];
  figures: PaperFigure[];
  tables: PaperTable[];
  citations: PaperCitation[];
}

/**
 * Paper section in structured format
 */
export interface PaperSection {
  id: string;
  level: number;
  title: string;
  content: string;
  subsections: PaperSection[];
  parentId?: string;
}

/**
 * Extracted algorithm from paper
 */
export interface PaperAlgorithm {
  id: string;
  name: string;
  description: string;
  pseudocode: string;
  inputs: string[];
  outputs: string[];
  complexity?: {
    time?: string;
    space?: string;
  };
  sectionId: string;
  pageNumber?: number;
}

/**
 * Equation from paper
 */
export interface PaperEquation {
  id: string;
  content: string;
  description?: string;
  sectionId: string;
  pageNumber?: number;
}

/**
 * Figure from paper
 */
export interface PaperFigure {
  id: string;
  caption: string;
  content?: string;
  description?: string;
  sectionId: string;
  pageNumber?: number;
}

/**
 * Table from paper
 */
export interface PaperTable {
  id: string;
  caption: string;
  rows: string[][];
  description?: string;
  sectionId: string;
  pageNumber?: number;
}

/**
 * Citation in paper
 */
export interface PaperCitation {
  id: string;
  text: string;
  doi?: string;
  url?: string;
}

/**
 * Knowledge representation of paper
 */
export interface PaperKnowledgeGraph {
  concepts: PaperConcept[];
  relationships: PaperConceptRelationship[];
}

/**
 * Concept extracted from paper
 */
export interface PaperConcept {
  id: string;
  name: string;
  description: string;
  type: 'algorithm' | 'method' | 'dataStructure' | 'parameter' | 'concept';
  sourceElements: string[]; // IDs of elements in the paper this concept relates to
}

/**
 * Relationship between concepts
 */
export interface PaperConceptRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'uses' | 'implements' | 'extends' | 'dependsOn' | 'refines';
  description?: string;
}

/**
 * Executable specification
 */
export interface ExecutableSpecification {
  id: string;
  title: string;
  description: string;
  inputs: {
    name: string;
    type: string;
    description: string;
    exampleValue: string;
  }[];
  outputs: {
    name: string;
    type: string;
    description: string;
    exampleValue: string;
  }[];
  steps: {
    id: string;
    description: string;
    code?: string;
    language?: string;
    expectedResult?: string;
  }[];
  sourceConceptIds: string[]; // Links to concepts in the knowledge graph
  verificationFixtures: {
    id: string;
    input: Record<string, any>;
    expectedOutput: any;
    description: string;
  }[];
}

/**
 * Traceability matrix for implementation
 */
export interface PaperTraceabilityMatrix {
  paperElements: {
    id: string;
    type: 'algorithm' | 'equation' | 'method' | 'concept';
    name: string;
    description: string;
  }[];
  codeElements: {
    id: string;
    type: 'class' | 'function' | 'method' | 'interface';
    name: string;
    filePath?: string;
    lineNumbers?: [number, number];
  }[];
  relationships: {
    paperElementId: string;
    codeElementId: string;
    type: 'implements' | 'partiallyImplements' | 'tests' | 'documents';
    confidence: number; // 0-1
    notes?: string;
  }[];
}

/**
 * Implementation plan
 */
export interface PaperImplementationPlan {
  id: string;
  title: string;
  stages: {
    id: string;
    name: string;
    description: string;
    components: {
      id: string;
      name: string;
      description: string;
      conceptIds: string[]; // Related concepts from knowledge graph
      dependencies: string[]; // IDs of other components
      status: 'notStarted' | 'inProgress' | 'implemented' | 'verified';
    }[];
  }[];
  verificationStrategy: {
    unitTests: string[];
    integrationTests: string[];
    validationExperiments: {
      name: string;
      description: string;
      expectedResults: string;
    }[];
  };
}

/**
 * GROBID extraction options
 */
export interface GrobidExtractionOptions {
  includeCitations?: boolean;
  includeRawText?: boolean;
  includeStructuredText?: boolean;
  includeFigures?: boolean;
  includeFormulas?: boolean;
  endpointUrl?: string;
}

/**
 * Paper architect module options
 */
export interface PaperArchitectOptions {
  paperFilePath?: string;
  outputDirectory?: string;
  grobidOptions?: GrobidExtractionOptions;
  generateExecutableSpecs?: boolean;
  generateImplementationPlan?: boolean;
  generateTraceabilityMatrix?: boolean;
  implementationLanguage?: string;
}