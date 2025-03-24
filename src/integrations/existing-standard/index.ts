/**
 * Existing Standard Project Integration
 * 
 * This integration handles the analysis and documentation of existing standard projects.
 * It represents the Existing+Standard quadrant of the 2x2 matrix.
 */

import { BaseProjectOptions } from '../../core/types';
import * as projectBase from '../../modules/project-base';
import * as existingAnalyzer from '../../modules/existing-analyzer';
import path from 'path';
import fs from 'fs';

/**
 * Options for analyzing an existing standard project
 */
export interface ExistingStandardProjectOptions extends BaseProjectOptions {
  projectPath: string;
  analysisDepth: 'basic' | 'standard' | 'deep';
  includeDotFiles: boolean;
  maxFileSize: number;
  includeNodeModules: boolean;
  generateDocumentation: boolean;
  validateExistingDocs: boolean;
}

/**
 * Analyze an existing standard project
 */
export async function analyzeExistingStandardProject(
  options: ExistingStandardProjectOptions
): Promise<existingAnalyzer.ProjectAnalysisResult> {
  // Validate project path
  if (!fs.existsSync(options.projectPath)) {
    throw new Error(`Project path does not exist: ${options.projectPath}`);
  }
  
  // Analyze project
  const analysisResult = await existingAnalyzer.analyzeExistingProject({
    path: options.projectPath,
    analysisDepth: options.analysisDepth,
    includeDotFiles: options.includeDotFiles,
    maxFileSize: options.maxFileSize,
    includeNodeModules: options.includeNodeModules,
    outputDirectory: options.outputDirectory,
    preserveExisting: options.preserveExisting
  });
  
  // Find existing documentation
  const existingDocs = await existingAnalyzer.analyzeExistingDocumentation(
    options.projectPath,
    {
      includeReadme: true,
      includeApiDocs: true,
      includeInlineComments: options.analysisDepth === 'deep'
    }
  );
  
  // Generate documentation if requested
  if (options.generateDocumentation) {
    await generateDocumentationForExistingProject(options, analysisResult, existingDocs);
  }
  
  return analysisResult;
}

/**
 * Generate documentation for an existing standard project
 */
async function generateDocumentationForExistingProject(
  options: ExistingStandardProjectOptions,
  analysisResult: existingAnalyzer.ProjectAnalysisResult,
  existingDocs: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>
): Promise<void> {
  const { projectPath } = options;
  const outputDir = projectBase.getProjectOutputDir(projectPath, options.outputDirectory);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create docs directory
  const docsDir = path.join(outputDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Generate project analysis document
  const analysisPath = path.join(docsDir, 'PROJECT_ANALYSIS.md');
  const analysisContent = generateProjectAnalysisContent(analysisResult);
  fs.writeFileSync(analysisPath, analysisContent, 'utf8');
  
  // Generate documentation assessment if existing docs are found
  if (existingDocs.length > 0) {
    const docsQuality = await existingAnalyzer.analyzeDocumentationQuality(existingDocs);
    const assessmentPath = path.join(docsDir, 'DOCUMENTATION_ASSESSMENT.md');
    const assessmentContent = generateDocumentationAssessmentContent(existingDocs, docsQuality);
    fs.writeFileSync(assessmentPath, assessmentContent, 'utf8');
    
    // Validate existing docs if requested
    if (options.validateExistingDocs) {
      const templateDir = path.join(process.cwd(), 'templates');
      const validationResult = await existingAnalyzer.validateDocumentation(
        existingDocs,
        templateDir
      );
      
      const validationPath = path.join(docsDir, 'DOCUMENTATION_VALIDATION.md');
      const validationContent = generateValidationReportContent(validationResult);
      fs.writeFileSync(validationPath, validationContent, 'utf8');
    }
  }
  
  // Generate architecture documentation based on component analysis
  const architecturePath = path.join(docsDir, 'ARCHITECTURE.md');
  const architectureContent = generateArchitectureContent(analysisResult);
  fs.writeFileSync(architecturePath, architectureContent, 'utf8');
  
  // Generate missing documentation based on the analysis
  await generateMissingDocumentation(options, analysisResult, existingDocs);
}

/**
 * Generate project analysis content
 */
function generateProjectAnalysisContent(analysisResult: existingAnalyzer.ProjectAnalysisResult): string {
  return `---
title: Project Analysis
description: Analysis of the existing project structure and components
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: project_analysis
---

# Project Analysis

## Project Type

Detected project type: **${analysisResult.detectedType}**

## Languages

${analysisResult.languages.map(lang => `- **${lang.name}**: ${lang.percentage}% (${lang.files} files)`).join('\n')}

## Frameworks and Libraries

${analysisResult.frameworks.length > 0 ? analysisResult.frameworks.map(fw => `- ${fw}`).join('\n') : 'No frameworks detected.'}

## Build Tools

${analysisResult.buildTools && analysisResult.buildTools.length > 0 ? 
  analysisResult.buildTools.map(tool => `- ${tool}`).join('\n') : 
  'No build tools detected.'}

## Components

${analysisResult.detectedComponents.map(comp => 
  `### ${comp.name} (${comp.type})\n\n` +
  `- **Path**: \`${comp.path}\`\n` +
  (comp.relationships.length > 0 ? 
    `- **Relationships**:\n${comp.relationships.map(rel => 
      `  - ${rel.relationType} ${rel.targetComponent}`).join('\n')}\n` : 
    '')
).join('\n\n')}

## Existing Documentation

${analysisResult.existingDocumentation.length > 0 ? 
  analysisResult.existingDocumentation.map(doc => 
    `- **${doc.type}**: \`${doc.path}\` (Last modified: ${new Date(doc.lastModified).toLocaleDateString()}, Schema compliant: ${doc.schemaCompliant ? 'Yes' : 'No'})`
  ).join('\n') : 
  'No existing documentation found.'}

${analysisResult.repositoryInfo ? 
  `## Repository Information\n\n` +
  `- **Type**: ${analysisResult.repositoryInfo.type}\n` +
  (analysisResult.repositoryInfo.remoteUrl ? `- **Remote URL**: ${analysisResult.repositoryInfo.remoteUrl}\n` : '') +
  (analysisResult.repositoryInfo.branch ? `- **Branch**: ${analysisResult.repositoryInfo.branch}\n` : '') : 
  ''}
`;
}

/**
 * Generate documentation assessment content
 */
function generateDocumentationAssessmentContent(
  existingDocs: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>,
  quality: {
    score: number;
    coverage: 'none' | 'minimal' | 'partial' | 'good' | 'comprehensive';
    recommendations: string[];
  }
): string {
  return `---
title: Documentation Assessment
description: Assessment of existing project documentation
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: documentation_assessment
---

# Documentation Assessment

## Overview

- **Documentation Score**: ${quality.score}/100
- **Coverage Level**: ${quality.coverage}
- **Total Documentation Files**: ${existingDocs.length}
- **Schema Compliant Files**: ${existingDocs.filter(d => d.schemaCompliant).length}

## Existing Documentation Files

${existingDocs.map(doc => 
  `- **${doc.type}**: \`${doc.path}\`\n` +
  `  - Last modified: ${new Date(doc.lastModified).toLocaleDateString()}\n` +
  `  - Schema compliant: ${doc.schemaCompliant ? 'Yes' : 'No'}`
).join('\n\n')}

## Recommendations

${quality.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

1. Address the recommendations above
2. Update existing documentation to comply with schema requirements
3. Create documentation for missing components and features
`;
}

/**
 * Generate validation report content
 */
function generateValidationReportContent(
  validation: {
    validFiles: number;
    invalidFiles: number;
    issues: Array<{ file: string; issues: string[] }>;
  }
): string {
  return `---
title: Documentation Validation
description: Validation of existing documentation against schema requirements
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: documentation_validation
---

# Documentation Validation

## Summary

- **Valid Files**: ${validation.validFiles}
- **Invalid Files**: ${validation.invalidFiles}
- **Total Files**: ${validation.validFiles + validation.invalidFiles}
- **Compliance Rate**: ${Math.round((validation.validFiles / (validation.validFiles + validation.invalidFiles || 1)) * 100)}%

## Issues Found

${validation.issues.length > 0 ? 
  validation.issues.map(issue => 
    `### ${issue.file}\n\n${issue.issues.map(i => `- ${i}`).join('\n')}`
  ).join('\n\n') : 
  'No issues found.'}

## Recommendations

1. Apply the required schema to all documentation files
2. Fix the identified issues in non-compliant files
3. Consider using documentation templates for new files
`;
}

/**
 * Generate architecture content
 */
function generateArchitectureContent(analysisResult: existingAnalyzer.ProjectAnalysisResult): string {
  // Group components by type
  const componentsByType: { [key: string]: Array<any> } = {};
  
  analysisResult.detectedComponents.forEach(component => {
    if (!componentsByType[component.type]) {
      componentsByType[component.type] = [];
    }
    componentsByType[component.type].push(component);
  });
  
  return `---
title: Architecture Documentation
description: Documentation of the project architecture based on analysis
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: architecture
---

# Architecture Documentation

## Overview

This document describes the architecture of the project based on automatic analysis.

## Project Type

Detected project type: **${analysisResult.detectedType}**

## Technology Stack

### Languages
${analysisResult.languages.map(lang => `- **${lang.name}**: ${lang.percentage}%`).join('\n')}

### Frameworks and Libraries
${analysisResult.frameworks.length > 0 ? analysisResult.frameworks.map(fw => `- ${fw}`).join('\n') : 'No frameworks detected.'}

### Build Tools
${analysisResult.buildTools && analysisResult.buildTools.length > 0 ? 
  analysisResult.buildTools.map(tool => `- ${tool}`).join('\n') : 
  'No build tools detected.'}

## Component Architecture

${Object.keys(componentsByType).map(type => 
  `### ${type}s\n\n` +
  componentsByType[type].map(comp => 
    `- **${comp.name}**\n` +
    `  - Path: \`${comp.path}\`\n` +
    (comp.relationships.length > 0 ? 
      `  - Relationships:\n${comp.relationships.map(rel => 
        `    - ${rel.relationType} ${rel.targetComponent}`).join('\n')}\n` : 
      '')
  ).join('\n\n')
).join('\n\n')}

## Component Relationships

The following diagram represents the detected relationships between components:

\`\`\`
[Component relationship diagram would be generated here]
\`\`\`

## Directory Structure

\`\`\`
[Directory structure would be included here]
\`\`\`

## Recommendations

- Consider documenting key components in more detail
- Add architecture diagrams for complex subsystems
- Document integration points between major components
`;
}

/**
 * Generate missing documentation based on analysis
 */
async function generateMissingDocumentation(
  options: ExistingStandardProjectOptions,
  analysisResult: existingAnalyzer.ProjectAnalysisResult,
  existingDocs: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>
): Promise<void> {
  const { projectPath } = options;
  const outputDir = projectBase.getProjectOutputDir(projectPath, options.outputDirectory);
  const docsDir = path.join(outputDir, 'docs');
  
  // Check if README exists
  const hasReadme = existingDocs.some(doc => doc.type === 'Readme');
  if (!hasReadme) {
    // Generate README
    const readmePath = path.join(docsDir, 'README.md');
    const readmeContent = generateReadmeContent(analysisResult);
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
  }
  
  // Check if API docs exist for API projects
  const hasApiDocs = existingDocs.some(doc => 
    doc.type === 'API Documentation' || doc.type === 'OpenAPI/Swagger'
  );
  
  if (analysisResult.detectedType === 'API' && !hasApiDocs) {
    // Generate API docs
    const apiDocsPath = path.join(docsDir, 'API.md');
    const apiDocsContent = generateApiDocContent(analysisResult);
    fs.writeFileSync(apiDocsPath, apiDocsContent, 'utf8');
  }
  
  // Generate component documentation
  const componentsDir = path.join(docsDir, 'components');
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }
  
  // Group components by type
  const componentsByType: { [key: string]: Array<any> } = {};
  
  analysisResult.detectedComponents.forEach(component => {
    if (!componentsByType[component.type]) {
      componentsByType[component.type] = [];
    }
    componentsByType[component.type].push(component);
  });
  
  // Generate docs for each component type
  for (const type in componentsByType) {
    const componentsOfType = componentsByType[type];
    const componentTypePath = path.join(componentsDir, `${type.toLowerCase()}s.md`);
    
    const componentTypeContent = generateComponentTypeDocContent(type, componentsOfType);
    fs.writeFileSync(componentTypePath, componentTypeContent, 'utf8');
  }
}

/**
 * Generate README content
 */
function generateReadmeContent(analysisResult: existingAnalyzer.ProjectAnalysisResult): string {
  return `---
title: Project README
description: Generated README for the project
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: readme
---

# Project Overview

## Description

This is a ${analysisResult.detectedType} project.

## Technology Stack

### Languages
${analysisResult.languages.map(lang => `- **${lang.name}**: ${lang.percentage}%`).join('\n')}

### Frameworks and Libraries
${analysisResult.frameworks.length > 0 ? analysisResult.frameworks.map(fw => `- ${fw}`).join('\n') : 'No frameworks detected.'}

## Getting Started

### Prerequisites

[List prerequisites based on detected frameworks and build tools]

### Installation

\`\`\`bash
# Installation steps would go here
\`\`\`

## Usage

[Basic usage examples would go here]

## Documentation

See the [docs directory](./docs) for full documentation.
`;
}

/**
 * Generate API documentation content
 */
function generateApiDocContent(analysisResult: existingAnalyzer.ProjectAnalysisResult): string {
  return `---
title: API Documentation
description: Documentation for the API endpoints
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: api_documentation
---

# API Documentation

This document provides documentation for the API endpoints in this project.

## Endpoints

[Endpoint documentation would go here based on analysis]

## Authentication

[Authentication methods would go here based on analysis]

## Data Models

[Data models would go here based on detected components]

## Error Handling

[Error handling patterns would go here]
`;
}

/**
 * Generate component type documentation content
 */
function generateComponentTypeDocContent(type: string, components: any[]): string {
  return `---
title: ${type} Documentation
description: Documentation for ${type.toLowerCase()} components
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: component_documentation
---

# ${type} Documentation

This document provides documentation for the ${type.toLowerCase()} components in this project.

${components.map(comp => 
  `## ${comp.name}\n\n` +
  `**Path**: \`${comp.path}\`\n\n` +
  `[Description would go here based on analysis]\n\n` +
  (comp.relationships.length > 0 ? 
    `### Relationships\n\n${comp.relationships.map(rel => 
      `- ${rel.relationType} ${rel.targetComponent}`).join('\n')}\n\n` : 
    '') +
  `### Usage\n\n[Usage examples would go here based on analysis]\n\n`
).join('\n')}
`;
}
