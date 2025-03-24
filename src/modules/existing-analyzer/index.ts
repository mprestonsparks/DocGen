/**
 * Existing Project Analyzer Module
 * 
 * Analyzes existing projects to gather information about structure, technologies, and documentation.
 * This functionality can be combined with paper-architect or used standalone.
 */

import { AnalysisOptions, ProjectAnalysisResult, BaseProjectOptions } from '../../core/types';
import { analyzeProject } from './analyzer';
import { findExistingDocumentation } from './documentation';

/**
 * Options for existing project analysis
 */
export interface ExistingProjectOptions extends BaseProjectOptions, AnalysisOptions {
  path: string;
  includeDotFiles: boolean;
  includeNodeModules: boolean;
}

/**
 * Documentation analysis options
 */
export interface DocumentationAnalysisOptions {
  includeReadme: boolean;
  includeApiDocs: boolean;
  includeInlineComments: boolean;
}

/**
 * Analyze an existing project
 */
export async function analyzeExistingProject(
  options: ExistingProjectOptions
): Promise<ProjectAnalysisResult> {
  return await analyzeProject(options.path, {
    analysisDepth: options.analysisDepth,
    includeDotFiles: options.includeDotFiles,
    maxFileSize: options.maxFileSize,
    includeNodeModules: options.includeNodeModules
  });
}

/**
 * Find documentation in an existing project
 */
export async function analyzeExistingDocumentation(
  projectPath: string,
  options: DocumentationAnalysisOptions
): Promise<Array<{
  path: string;
  type: string;
  lastModified: string;
  schemaCompliant: boolean;
}>> {
  return await findExistingDocumentation(projectPath, options);
}

export * from './analyzer';
export * from './documentation';
