/**
 * Existing Paper Project Integration
 * 
 * This integration handles the analysis and documentation of existing paper-based projects.
 * It represents the Existing+Paper quadrant of the 2x2 matrix.
 */

import { BaseProjectOptions } from '../../core/types';
import * as projectBase from '../../modules/project-base';
import * as existingAnalyzer from '../../modules/existing-analyzer';
import * as paperArchitect from '../../modules/paper-architect';
import path from 'path';
import fs from 'fs';

/**
 * Options for analyzing an existing paper-based project
 */
export interface ExistingPaperProjectOptions extends BaseProjectOptions {
  projectPath: string;
  paperPath: string;
  analysisDepth: 'basic' | 'standard' | 'deep';
  includeDotFiles: boolean;
  maxFileSize: number;
  includeNodeModules: boolean;
  generateTraceability: boolean;
  generateKnowledgeGraph?: boolean;
  updateImplementation?: boolean;
  outputFormat?: 'markdown' | 'json' | 'yaml';
}

/**
 * Analyze an existing paper-based project
 */
export async function analyzeExistingPaperProject(
  options: ExistingPaperProjectOptions
): Promise<{
  projectAnalysis: existingAnalyzer.ProjectAnalysisResult;
  paperContent: any;
  traceability: Array<{
    paperElementId: string;
    codeElement: {
      id: string;
      type: string;
      name: string;
      filePath: string;
      lineNumbers: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'references';
    confidence: number;
    notes: string;
  }>;
}> {
  // Validate paths
  if (!fs.existsSync(options.projectPath)) {
    throw new Error(`Project path does not exist: ${options.projectPath}`);
  }
  
  if (!fs.existsSync(options.paperPath)) {
    throw new Error(`Paper file not found: ${options.paperPath}`);
  }
  
  // Analyze existing project
  const projectAnalysis = await existingAnalyzer.analyzeExistingProject({
    path: options.projectPath,
    analysisDepth: options.analysisDepth,
    includeDotFiles: options.includeDotFiles,
    maxFileSize: options.maxFileSize,
    includeNodeModules: options.includeNodeModules,
    outputDirectory: options.outputDirectory,
    preserveExisting: options.preserveExisting
  });
  
  // Process paper
  const paperContent = await paperArchitect.processPaper({
    paperPath: options.paperPath,
    outputDirectory: options.outputDirectory,
    preserveExisting: options.preserveExisting,
    outputFormat: options.outputFormat || 'markdown',
    extractReferences: true,
    generateKnowledgeGraph: options.generateKnowledgeGraph !== false,
    generateImplementationPlan: false,
    generateSpecifications: false,
    generateTraceability: options.generateTraceability
  });
  
  // Generate traceability matrix between paper and existing code
  const traceability = await paperArchitect.generateTraceabilityMatrix(
    paperContent,
    {
      path: options.projectPath,
      files: await getProjectFiles(options)
    }
  );
  
  // Generate documentation and artifacts for existing paper-based project
  await generateExistingPaperDocumentation(options, projectAnalysis, paperContent, traceability);
  
  // Update implementation if requested
  if (options.updateImplementation) {
    await updateProjectImplementation(options, projectAnalysis, paperContent, traceability);
  }
  
  return {
    projectAnalysis,
    paperContent,
    traceability
  };
}

/**
 * Get project files for traceability analysis
 */
async function getProjectFiles(options: ExistingPaperProjectOptions): Promise<Array<{
  path: string;
  content?: string;
}>> {
  // Implementation will be based on projectAnalyzer functionality
  // This is a simplified version
  const fileList: Array<{ path: string; content?: string }> = [];
  
  // Recursively read directory and collect files
  async function readDirRecursively(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules if not included
        if (entry.name === 'node_modules' && !options.includeNodeModules) {
          continue;
        }
        
        // Skip dot directories if not included
        if (entry.name.startsWith('.') && !options.includeDotFiles) {
          continue;
        }
        
        await readDirRecursively(fullPath);
      } else {
        // Skip dot files if not included
        if (entry.name.startsWith('.') && !options.includeDotFiles) {
          continue;
        }
        
        // Check file size
        const stats = fs.statSync(fullPath);
        if (stats.size > options.maxFileSize) {
          continue;
        }
        
        fileList.push({
          path: fullPath.replace(options.projectPath, '').replace(/\\/g, '/').replace(/^\//, '')
        });
        
        // Only read file content for deep analysis
        if (options.analysisDepth === 'deep') {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            fileList[fileList.length - 1].content = content;
          } catch (error) {
            // Skip files that can't be read as text
          }
        }
      }
    }
  }
  
  await readDirRecursively(options.projectPath);
  return fileList;
}

/**
 * Generate documentation for an existing paper-based project
 */
async function generateExistingPaperDocumentation(
  options: ExistingPaperProjectOptions,
  projectAnalysis: existingAnalyzer.ProjectAnalysisResult,
  paperContent: any,
  traceability: Array<{
    paperElementId: string;
    codeElement: {
      id: string;
      type: string;
      name: string;
      filePath: string;
      lineNumbers: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'references';
    confidence: number;
    notes: string;
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
  
  // Create paper directory
  const paperDir = path.join(docsDir, 'paper');
  if (!fs.existsSync(paperDir)) {
    fs.mkdirSync(paperDir, { recursive: true });
  }
  
  // Create paper summary
  const summaryPath = path.join(paperDir, 'SUMMARY.md');
  if (!fs.existsSync(summaryPath) || !options.preserveExisting) {
    const summaryContent = generatePaperSummaryContent(paperContent);
    fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  }
  
  // Create project analysis document
  const analysisPath = path.join(docsDir, 'PROJECT_ANALYSIS.md');
  const analysisContent = generateProjectAnalysisContent(projectAnalysis);
  fs.writeFileSync(analysisPath, analysisContent, 'utf8');
  
  // Create traceability document
  const traceabilityPath = path.join(paperDir, 'TRACEABILITY.md');
  const traceabilityContent = generateTraceabilityContent(paperContent, traceability);
  fs.writeFileSync(traceabilityPath, traceabilityContent, 'utf8');
  
  // Generate algorithms document if there are algorithms in the paper
  if (paperContent.algorithms && paperContent.algorithms.length > 0) {
    const algorithmsPath = path.join(paperDir, 'ALGORITHMS.md');
    if (!fs.existsSync(algorithmsPath) || !options.preserveExisting) {
      const algorithmsContent = generateAlgorithmsContent(paperContent);
      fs.writeFileSync(algorithmsPath, algorithmsContent, 'utf8');
    }
  }
  
  // Generate knowledge graph if requested
  if (options.generateKnowledgeGraph !== false) {
    const graphOutput = await paperArchitect.generateKnowledgeGraph(paperContent, {
      depth: 'standard',
      includeReferences: true,
      outputFormat: 'json'
    });
    
    const graphPath = path.join(paperDir, 'KNOWLEDGE_GRAPH.json');
    fs.writeFileSync(graphPath, JSON.stringify(graphOutput, null, 2), 'utf8');
  }
  
  // Generate implementation gap analysis
  const gapAnalysisPath = path.join(paperDir, 'IMPLEMENTATION_GAPS.md');
  const gapAnalysisContent = generateImplementationGapAnalysisContent(paperContent, traceability);
  fs.writeFileSync(gapAnalysisPath, gapAnalysisContent, 'utf8');
}

/**
 * Update the project implementation based on paper
 */
async function updateProjectImplementation(
  options: ExistingPaperProjectOptions,
  projectAnalysis: existingAnalyzer.ProjectAnalysisResult,
  paperContent: any,
  traceability: Array<{
    paperElementId: string;
    codeElement: {
      id: string;
      type: string;
      name: string;
      filePath: string;
      lineNumbers: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'references';
    confidence: number;
    notes: string;
  }>
): Promise<void> {
  // Update traceability information
  const traceabilityResult = await paperArchitect.updateTraceability(
    options.paperPath,
    options.projectPath,
    {
      outputFile: path.join(
        projectBase.getProjectOutputDir(options.projectPath, options.outputDirectory),
        'paper-code-mapping.json'
      ),
      updateComments: true
    }
  );
  
  // Log the result
  console.log(`Traceability update: ${traceabilityResult.updated} updated, ${traceabilityResult.added} added, ${traceabilityResult.removed} removed`);
  
  // Additional implementation updates would be handled here
}

/**
 * Generate paper summary content
 */
function generatePaperSummaryContent(paperContent: any): string {
  return `---
title: Paper Summary
description: Summary of ${paperContent.title}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: paper_summary
---

# Paper Summary

## ${paperContent.title}

**Authors:** ${paperContent.authors.join(', ')}

## Abstract

${paperContent.abstract}

## Key Sections

${paperContent.sections.map(section => `### ${section.title}\n\n${section.content}\n\n${section.subsections ? section.subsections.map(sub => `#### ${sub.title}\n\n${sub.content}\n\n`).join('') : ''}`).join('')}

## References

${paperContent.references.map(ref => `- [${ref.id}] ${ref.title}. ${ref.authors.join(', ')} (${ref.year})${ref.url ? ` [Link](${ref.url})` : ''}`).join('\n')}
`;
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
 * Generate traceability content
 */
function generateTraceabilityContent(
  paperContent: any,
  traceability: Array<{
    paperElementId: string;
    codeElement: {
      id: string;
      type: string;
      name: string;
      filePath: string;
      lineNumbers: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'references';
    confidence: number;
    notes: string;
  }>
): string {
  // Group traceability by paper element type
  const paperElements: Record<string, any> = {};
  
  // Collect all paper elements (algorithms, equations, etc.)
  if (paperContent.algorithms) {
    paperContent.algorithms.forEach((algo: any) => {
      paperElements[algo.id] = {
        id: algo.id,
        name: algo.name,
        type: 'algorithm',
        description: algo.description
      };
    });
  }
  
  if (paperContent.equations) {
    paperContent.equations.forEach((eq: any) => {
      paperElements[eq.id] = {
        id: eq.id,
        name: `Equation ${eq.id}`,
        type: 'equation',
        description: eq.description
      };
    });
  }
  
  // Group by element type
  const traceabilityByType: Record<string, Array<any>> = {};
  
  traceability.forEach(item => {
    const paperElement = paperElements[item.paperElementId];
    if (paperElement) {
      const type = paperElement.type;
      if (!traceabilityByType[type]) {
        traceabilityByType[type] = [];
      }
      
      traceabilityByType[type].push({
        ...item,
        paperElement
      });
    }
  });
  
  return `---
title: Paper-Code Traceability Matrix
description: Traceability between paper elements and code implementation
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: traceability
---

# Paper-Code Traceability Matrix

This document maps elements from the research paper to their implementations in the codebase.

## Summary

- **Total paper elements**: ${Object.keys(paperElements).length}
- **Elements with implementations**: ${traceability.length}
- **Implementation coverage**: ${Math.round((traceability.length / (Object.keys(paperElements).length || 1)) * 100)}%

## Traceability by Type

${Object.keys(traceabilityByType).map(type => `
### ${type.charAt(0).toUpperCase() + type.slice(1)}s

${traceabilityByType[type].map(item => `
#### ${item.paperElement.name}

- **Paper element ID**: ${item.paperElementId}
- **Implementation type**: ${item.type}
- **Confidence score**: ${(item.confidence * 100).toFixed(1)}%
- **Code element**: \`${item.codeElement.name}\` (${item.codeElement.type})
- **File path**: \`${item.codeElement.filePath}\`
- **Line numbers**: ${item.codeElement.lineNumbers[0]}-${item.codeElement.lineNumbers[1]}
- **Notes**: ${item.notes}
`).join('')}
`).join('')}

## Usage Guide

This traceability matrix can be used to:

1. Understand how paper concepts are implemented in code
2. Identify gaps in implementation
3. Verify the correctness of implementations against paper specifications
4. Assist in code review by cross-referencing with paper algorithms
`;
}

/**
 * Generate algorithms content
 */
function generateAlgorithmsContent(paperContent: any): string {
  return `---
title: Algorithms
description: Algorithms from ${paperContent.title}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: paper_algorithms
---

# Algorithms

This document describes the algorithms presented in the paper.

${paperContent.algorithms.map((algo: any) => `## ${algo.name}\n\n**ID:** ${algo.id}\n\n${algo.description}\n\n${algo.pseudocode ? `### Pseudocode\n\n\`\`\`\n${algo.pseudocode}\n\`\`\`\n\n` : ''}`).join('')}
`;
}

/**
 * Generate implementation gap analysis content
 */
function generateImplementationGapAnalysisContent(
  paperContent: any,
  traceability: Array<{
    paperElementId: string;
    codeElement: {
      id: string;
      type: string;
      name: string;
      filePath: string;
      lineNumbers: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'references';
    confidence: number;
    notes: string;
  }>
): string {
  // Collect all paper elements
  const paperElements: Record<string, any> = {};
  
  if (paperContent.algorithms) {
    paperContent.algorithms.forEach((algo: any) => {
      paperElements[algo.id] = {
        id: algo.id,
        name: algo.name,
        type: 'algorithm',
        description: algo.description
      };
    });
  }
  
  if (paperContent.equations) {
    paperContent.equations.forEach((eq: any) => {
      paperElements[eq.id] = {
        id: eq.id,
        name: `Equation ${eq.id}`,
        type: 'equation',
        description: eq.description
      };
    });
  }
  
  // Find implemented elements
  const implementedElementIds = traceability.map(item => item.paperElementId);
  
  // Find non-implemented elements
  const nonImplementedElements = Object.values(paperElements).filter(
    (element: any) => !implementedElementIds.includes(element.id)
  );
  
  // Find partially implemented elements
  const partiallyImplementedElements = traceability
    .filter(item => item.type === 'partiallyImplements')
    .map(item => {
      return {
        ...item,
        paperElement: paperElements[item.paperElementId]
      };
    });
  
  return `---
title: Implementation Gap Analysis
description: Analysis of gaps between paper and implementation
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: gap_analysis
---

# Implementation Gap Analysis

This document analyzes the gaps between the paper's elements and their implementations in the codebase.

## Implementation Status

- **Total paper elements**: ${Object.keys(paperElements).length}
- **Fully implemented elements**: ${traceability.filter(t => t.type === 'implements').length}
- **Partially implemented elements**: ${partiallyImplementedElements.length}
- **Non-implemented elements**: ${nonImplementedElements.length}
- **Implementation coverage**: ${Math.round((traceability.filter(t => t.type === 'implements').length / (Object.keys(paperElements).length || 1)) * 100)}%

## Non-Implemented Elements

${nonImplementedElements.length > 0 ? 
  nonImplementedElements.map((element: any) => 
    `### ${element.name}\n\n` +
    `- **Type**: ${element.type}\n` +
    `- **Description**: ${element.description}\n\n` +
    `**Implementation recommendation**: [Implementation recommendations would go here]\n\n`
  ).join('') : 
  'All paper elements have some level of implementation.'}

## Partially Implemented Elements

${partiallyImplementedElements.length > 0 ? 
  partiallyImplementedElements.map((item: any) => 
    `### ${item.paperElement.name}\n\n` +
    `- **Type**: ${item.paperElement.type}\n` +
    `- **Current implementation**: \`${item.codeElement.name}\` in \`${item.codeElement.filePath}\`\n` +
    `- **Confidence score**: ${(item.confidence * 100).toFixed(1)}%\n` +
    `- **Notes**: ${item.notes}\n\n` +
    `**Gap details**: This element is partially implemented. The following aspects need to be addressed:\n\n` +
    `[Gap details would go here]\n\n`
  ).join('') : 
  'There are no partially implemented elements.'}

## Recommendations

1. Prioritize implementation of missing elements
2. Improve partial implementations to fully match paper specifications
3. Add comprehensive tests to verify implementation correctness against paper specifications
4. Update documentation to reflect the relationship between paper concepts and code
`;
}
