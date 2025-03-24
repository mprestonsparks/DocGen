/**
 * Project types for DocGen
 */

export interface ExistingProjectOptions {
  /**
   * The root directory of the project to analyze
   */
  projectRoot: string;

  /**
   * The output directory for generated documentation
   */
  outputDirectory?: string;

  /**
   * The type of project (e.g., 'typescript', 'python', etc.)
   */
  projectType?: string;

  /**
   * The path to the project configuration file
   */
  configPath?: string;

  /**
   * The path to the output directory
   */
  path?: string;

  /**
   * The depth of analysis for the project
   */
  analysisDepth?: number;

  /**
   * Whether to preserve existing documentation
   */
  preserveExisting?: boolean;

  /**
   * Whether to generate integration guide
   */
  generateIntegrationGuide?: boolean;

  /**
   * Whether to include test files in the analysis
   */
  includeTests?: boolean;

  /**
   * Whether to include private members in the documentation
   */
  includePrivate?: boolean;

  /**
   * Whether to include internal members in the documentation
   */
  includeInternal?: boolean;

  /**
   * Whether to include protected members in the documentation
   */
  includeProtected?: boolean;

  /**
   * Whether to include inherited members in the documentation
   */
  includeInherited?: boolean;

  /**
   * Custom tags to include in the documentation
   */
  customTags?: string[];

  /**
   * Whether to generate diagrams
   */
  generateDiagrams?: boolean;

  /**
   * Whether to include source code in the documentation
   */
  includeSource?: boolean;

  /**
   * Whether to include examples in the documentation
   */
  includeExamples?: boolean;

  /**
   * Whether to include references to other documentation
   */
  includeReferences?: boolean;

  /**
   * Whether to check for consistency in documentation
   */
  checkConsistency?: boolean;

  /**
   * Whether to analyze dependencies
   */
  analyzeDependencies?: boolean;

  /**
   * Whether to generate API documentation
   */
  generateApiDocs?: boolean;

  /**
   * Whether to generate architecture documentation
   */
  generateArchitectureDocs?: boolean;

  /**
   * Whether to generate setup/deployment documentation
   */
  generateDeploymentDocs?: boolean;

  /**
   * Custom patterns to include in the analysis
   */
  includePatterns?: string[];

  /**
   * Custom patterns to exclude from the analysis
   */
  excludePatterns?: string[];
}
