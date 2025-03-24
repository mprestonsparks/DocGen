/**
 * Project Base Module
 * 
 * Core functionality for any project type, whether new or existing
 */

import { BaseProjectOptions } from '../../core/types';
import path from 'path';
import fs from 'fs';

/**
 * Base project options with path
 */
export interface ProjectBaseOptions extends BaseProjectOptions {
  projectPath: string;
  projectName: string;
  projectDescription?: string;
}

/**
 * Initialize a project directory and base structure
 */
export function initializeProjectDirectory(options: ProjectBaseOptions): void {
  const { projectPath, outputDirectory, preserveExisting } = options;
  
  // Create the project directory if it doesn't exist
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  
  // Create the output directory if it doesn't exist
  const outputPath = path.isAbsolute(outputDirectory) 
    ? outputDirectory 
    : path.join(projectPath, outputDirectory);
    
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // Create basic structure for documentation
  const docsDir = path.join(outputPath, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Create templates directory
  const templatesDir = path.join(outputPath, 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }
}

/**
 * Create a basic project configuration file
 */
export function createProjectConfigFile(options: ProjectBaseOptions): void {
  const { projectPath, projectName, projectDescription, outputDirectory } = options;
  
  const configPath = path.join(projectPath, 'docgen.config.json');
  
  // Don't overwrite if exists and preserveExisting is true
  if (fs.existsSync(configPath) && options.preserveExisting) {
    console.log(`Configuration file already exists at ${configPath}`);
    return;
  }
  
  const config = {
    projectName,
    projectDescription: projectDescription || `${projectName} documentation`,
    outputDirectory,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    settings: {
      enableAIEnhancement: true,
      enableAdvancedValidation: true
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`Created project configuration at ${configPath}`);
}

/**
 * Get the project output directory path
 */
export function getProjectOutputDir(projectPath: string, outputDirectory?: string): string {
  const defaultOutputDir = 'docgen-output';
  const outputDir = outputDirectory || defaultOutputDir;
  
  // If path is absolute, use it directly
  if (path.isAbsolute(outputDir)) {
    return outputDir;
  }
  
  // Otherwise, create the path relative to the project directory
  return path.join(projectPath, outputDir);
}
