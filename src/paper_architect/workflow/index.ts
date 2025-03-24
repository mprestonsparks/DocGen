/**
 * Implementation Workflow Module
 * 
 * This module guides the implementation of academic papers through a structured
 * bottom-up approach. It creates implementation plans, tracks progress, and
 * provides guidance for handling challenges in paper implementation.
 */

import * as logger from '../../utils/logger';
import * as llm from '../../utils/llm';
import * as utils from '../utils';

import {
  PaperContent,
  PaperKnowledgeGraph,
  PaperImplementationPlan
} from '../../types';

/**
 * Generate an implementation plan for the paper
 * @param paperContent Extracted paper content
 * @param knowledgeGraph Knowledge graph of the paper
 * @param implementationLanguage Target implementation language
 * @returns Implementation plan
 */
export async function generateImplementationPlan(
  paperContent: PaperContent,
  knowledgeGraph: PaperKnowledgeGraph,
  implementationLanguage: string = 'python'
): Promise<PaperImplementationPlan> {
  try {
    logger.info('Generating implementation plan', { implementationLanguage });
    
    // If LLM is available, use it to generate a plan
    if (llm.isLLMApiAvailable()) {
      const llmPlan = await generatePlanWithLLM(paperContent, knowledgeGraph, implementationLanguage);
      if (llmPlan) {
        return llmPlan;
      }
    }
    
    // Fallback: Generate a basic implementation plan
    return generateBasicImplementationPlan(paperContent, knowledgeGraph, implementationLanguage);
  } catch (error) {
    logger.error('Error generating implementation plan', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return a minimal plan
    return {
      id: 'fallback-plan',
      title: 'Basic Implementation Plan',
      stages: [
        {
          id: 'stage-1',
          name: 'Foundation Layer',
          description: 'Implement the core components and data structures',
          components: []
        }
      ],
      verificationStrategy: {
        unitTests: [],
        integrationTests: [],
        validationExperiments: []
      }
    };
  }
}

/**
 * Generate an implementation plan using LLM
 * @param paperContent Extracted paper content
 * @param knowledgeGraph Knowledge graph of the paper
 * @param implementationLanguage Target implementation language
 * @returns Implementation plan
 */
async function generatePlanWithLLM(
  paperContent: PaperContent,
  knowledgeGraph: PaperKnowledgeGraph,
  implementationLanguage: string
): Promise<PaperImplementationPlan | null> {
  try {
    logger.info('Generating implementation plan with LLM');
    
    // Create a summary of paper content for the LLM
    const paperSummary = createPaperSummary(paperContent);
    
    // Create summary of identified concepts
    const conceptsSummary = knowledgeGraph.concepts.map(concept => 
      `- ${concept.name} (${concept.type}): ${concept.description}`
    ).join('\n');
    
    // Create summary of relationships
    const relationshipsSummary = knowledgeGraph.relationships.map(rel => {
      const source = knowledgeGraph.concepts.find(c => c.id === rel.sourceId);
      const target = knowledgeGraph.concepts.find(c => c.id === rel.targetId);
      
      if (!source || !target) return '';
      
      return `- ${source.name} ${rel.type} ${target.name}: ${rel.description || ''}`;
    }).filter(Boolean).join('\n');
    
    // Create prompt for the LLM
    const prompt = `
      I need to create an implementation plan for an academic paper. The plan should follow a bottom-up approach where foundational components are implemented first, followed by core algorithms, integration, optimization, and evaluation.
      
      Paper Title: ${paperContent.paperInfo.title}
      
      Paper Summary:
      ${paperSummary}
      
      Identified Concepts:
      ${conceptsSummary}
      
      Concept Relationships:
      ${relationshipsSummary}
      
      Target Implementation Language: ${implementationLanguage}
      
      Please create a detailed implementation plan with:
      1. A staged approach (Foundation Layer, Core Algorithm Layer, Integration Layer, Optimization Layer, Evaluation Layer)
      2. Components to implement in each stage with dependencies identified
      3. A verification strategy including unit tests, integration tests, and experiments to validate against the paper
      
      Return your answer as JSON in this format:
      {
        "title": "Implementation Plan for [Paper Title]",
        "stages": [
          {
            "id": "stage-1",
            "name": "Foundation Layer",
            "description": "Description of this stage",
            "components": [
              {
                "id": "component-1",
                "name": "Component Name",
                "description": "Component description",
                "conceptIds": ["List of related concept IDs"],
                "dependencies": ["List of other component IDs this depends on"],
                "status": "notStarted"
              }
            ]
          }
        ],
        "verificationStrategy": {
          "unitTests": ["List of unit tests to write"],
          "integrationTests": ["List of integration tests"],
          "validationExperiments": [
            {
              "name": "Experiment Name",
              "description": "Description of experiment",
              "expectedResults": "Expected results based on paper"
            }
          ]
        }
      }
    `;
    
    // Get response from LLM
    const response = await llm.query(prompt);
    
    // Parse plan from response
    try {
      // Extract JSON from the response
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim();
        const plan = JSON.parse(jsonString);
        
        return {
          id: utils.generateUniqueId('plan', paperContent.paperInfo.title),
          title: plan.title || `Implementation Plan for ${paperContent.paperInfo.title}`,
          stages: plan.stages || [],
          verificationStrategy: plan.verificationStrategy || {
            unitTests: [],
            integrationTests: [],
            validationExperiments: []
          }
        };
      }
    } catch (parseError) {
      logger.error('Error parsing LLM response for implementation plan', { 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
    }
    
    return null;
  } catch (error) {
    logger.error('Error generating implementation plan with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Generate a basic implementation plan based on concepts and algorithms
 * @param paperContent Extracted paper content
 * @param knowledgeGraph Knowledge graph of the paper
 * @param implementationLanguage Target implementation language
 * @returns Basic implementation plan
 */
function generateBasicImplementationPlan(
  paperContent: PaperContent,
  knowledgeGraph: PaperKnowledgeGraph,
  implementationLanguage: string
): PaperImplementationPlan {
  try {
    logger.info('Generating basic implementation plan');
    
    // Create a unique ID for the plan
    const planId = utils.generateUniqueId('plan', paperContent.paperInfo.title);
    
    // Group concepts by type for different implementation stages
    const dataStructures = knowledgeGraph.concepts.filter(c => c.type === 'dataStructure');
    const algorithms = knowledgeGraph.concepts.filter(c => c.type === 'algorithm');
    const methods = knowledgeGraph.concepts.filter(c => c.type === 'method');
    const parameters = knowledgeGraph.concepts.filter(c => c.type === 'parameter');
    const otherConcepts = knowledgeGraph.concepts.filter(c => 
      !['dataStructure', 'algorithm', 'method', 'parameter'].includes(c.type)
    );
    
    // Create implementation stages
    type StageType = {
      id: string;
      name: string;
      description: string;
      components: Array<{
        id: string;
        name: string;
        description: string;
        conceptIds: string[];
        dependencies: string[];
        status: 'notStarted' | 'inProgress' | 'implemented' | 'verified';
      }>;
    };
    
    const stages: StageType[] = [
      {
        id: 'stage-1',
        name: 'Foundation Layer',
        description: 'Implement basic data structures and utility functions',
        components: [
          ...dataStructures.map((concept, index) => ({
            id: `component-1-${index + 1}`,
            name: concept.name,
            description: concept.description,
            conceptIds: [concept.id],
            dependencies: [],
            status: 'notStarted' as const
          })),
          ...parameters.map((concept, index) => ({
            id: `component-1-${dataStructures.length + index + 1}`,
            name: concept.name,
            description: concept.description,
            conceptIds: [concept.id],
            dependencies: [],
            status: 'notStarted' as const
          }))
        ]
      },
      {
        id: 'stage-2',
        name: 'Core Algorithm Layer',
        description: 'Implement the core algorithms and methods',
        components: [
          ...methods.map((concept, index) => ({
            id: `component-2-${index + 1}`,
            name: concept.name,
            description: concept.description,
            conceptIds: [concept.id],
            dependencies: getConceptDependencies(concept.id, knowledgeGraph)
              .map((depId: string) => {
                const stage1Components = stages[0].components.find((c: any) => 
                  c.conceptIds.includes(depId)
                );
                return stage1Components ? stage1Components.id : '';
              })
              .filter(Boolean) as string[],
            status: 'notStarted' as const
          })),
          ...algorithms.map((concept, index) => ({
            id: `component-2-${methods.length + index + 1}`,
            name: concept.name,
            description: concept.description,
            conceptIds: [concept.id],
            dependencies: getConceptDependencies(concept.id, knowledgeGraph)
              .map((depId: string) => {
                // Check in stage 1
                const stage1Component = stages[0].components.find((c: any) => 
                  c.conceptIds.includes(depId)
                );
                if (stage1Component) return stage1Component.id;
                
                // Check in current stage
                const currentStageComponent = methods.find((m: any) => m.id === depId);
                if (currentStageComponent) {
                  return `component-2-${methods.findIndex((m: any) => m.id === depId) + 1}`;
                }
                
                return '';
              })
              .filter(Boolean) as string[],
            status: 'notStarted' as const
          }))
        ]
      },
      {
        id: 'stage-3',
        name: 'Integration Layer',
        description: 'Integrate components and implement overall system',
        components: otherConcepts.map((concept, index) => ({
          id: `component-3-${index + 1}`,
          name: concept.name,
          description: concept.description,
          conceptIds: [concept.id],
          dependencies: getConceptDependencies(concept.id, knowledgeGraph)
            .map((depId: string) => {
              // Check in stage 1
              const stage1Component = stages[0].components.find((c: any) => 
                c.conceptIds.includes(depId)
              );
              if (stage1Component) return stage1Component.id;
              
              // Check in stage 2
              const stage2Component = stages[1].components.find((c: any) => 
                c.conceptIds.includes(depId)
              );
              if (stage2Component) return stage2Component.id;
              
              // Check in current stage
              const currentIndex = otherConcepts.findIndex((c: any) => c.id === depId);
              if (currentIndex >= 0 && currentIndex < index) {
                return `component-3-${currentIndex + 1}`;
              }
              
              return '';
            })
            .filter(Boolean) as string[],
          status: 'notStarted' as const
        }))
      }
    ];
    
    // Add optimization and evaluation stages if needed
    if (algorithms.length > 0) {
      stages.push({
        id: 'stage-4',
        name: 'Optimization Layer',
        description: 'Optimize performance and handle edge cases',
        components: algorithms.map((concept, index) => ({
          id: `component-4-${index + 1}`,
          name: `Optimize ${concept.name}`,
          description: `Optimize the performance of ${concept.name} and handle edge cases`,
          conceptIds: [concept.id],
          dependencies: [`component-2-${methods.length + index + 1}`],
          status: 'notStarted' as const
        }))
      });
      
      stages.push({
        id: 'stage-5',
        name: 'Evaluation Layer',
        description: 'Implement evaluation metrics and compare with paper results',
        components: [{
          id: 'component-5-1',
          name: 'Evaluation Framework',
          description: 'Framework for evaluating the implementation against the paper results',
          conceptIds: [],
          dependencies: stages[3].components.map(c => c.id),
          status: 'notStarted' as const
        }]
      });
    }
    
    // Generate verification strategy
    const unitTests = [
      ...dataStructures.map(c => `Test ${c.name} functionality`),
      ...methods.map(c => `Test ${c.name} with various inputs`),
      ...algorithms.map(c => `Test ${c.name} against known examples`)
    ];
    
    const integrationTests = [
      'Test component interactions',
      'Test end-to-end workflow',
      'Test with different configurations'
    ];
    
    const validationExperiments = [{
      name: 'Reproduce Paper Results',
      description: `Reproduce the experiments from the paper "${paperContent.paperInfo.title}"`,
      expectedResults: 'Results should match those reported in the paper'
    }];
    
    return {
      id: planId,
      title: `Implementation Plan for ${paperContent.paperInfo.title}`,
      stages: stages.filter(stage => stage.components.length > 0),
      verificationStrategy: {
        unitTests,
        integrationTests,
        validationExperiments
      }
    };
  } catch (error) {
    logger.error('Error generating basic implementation plan', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return a minimal plan
    return {
      id: 'error-plan',
      title: `Implementation Plan for ${paperContent.paperInfo.title}`,
      stages: [{
        id: 'stage-1',
        name: 'Foundation Layer',
        description: 'Implement the basic components',
        components: []
      }],
      verificationStrategy: {
        unitTests: [],
        integrationTests: [],
        validationExperiments: []
      }
    };
  }
}

/**
 * Get dependencies for a concept based on knowledge graph relationships
 * @param conceptId ID of the concept
 * @param knowledgeGraph Knowledge graph
 * @returns Array of concept IDs that this concept depends on
 */
function getConceptDependencies(conceptId: string, knowledgeGraph: PaperKnowledgeGraph): string[] {
  // Find all relationships where this concept is the source
  const relationships = knowledgeGraph.relationships.filter(rel => 
    rel.sourceId === conceptId && 
    (rel.type === 'uses' || rel.type === 'dependsOn' || rel.type === 'implements')
  );
  
  // Return the target concept IDs
  return relationships.map(rel => rel.targetId);
}

/**
 * Create a summary of the paper content for prompts
 * @param paperContent Extracted paper content
 * @returns Summary text
 */
function createPaperSummary(paperContent: PaperContent): string {
  let summary = `${paperContent.paperInfo.abstract}\n\n`;
  
  // Add information about algorithms
  if (paperContent.algorithms.length > 0) {
    summary += 'Algorithms:\n';
    paperContent.algorithms.forEach(algorithm => {
      summary += `- ${algorithm.name}: ${algorithm.description}\n`;
    });
    summary += '\n';
  }
  
  // Add information about equations
  if (paperContent.equations.length > 0) {
    summary += `The paper contains ${paperContent.equations.length} equations.\n\n`;
  }
  
  return summary;
}

/**
 * Format an implementation plan as markdown
 * @param plan Implementation plan
 * @returns Markdown string
 */
export function formatImplementationPlan(plan: PaperImplementationPlan): string {
  try {
    logger.info(`Formatting implementation plan: ${plan.title}`);
    
    let markdown = `---
title: "${plan.title}"
id: "${plan.id}"
type: "implementation_plan"
status: "DRAFT"
---

# ${plan.title}

## Overview

This document outlines a structured approach for implementing the paper, following a bottom-up methodology where foundational components are built first, followed by core algorithms, integration, optimization, and evaluation.

## Implementation Stages

`;
    
    // Add stages
    plan.stages.forEach(stage => {
      markdown += `### ${stage.name}\n\n`;
      markdown += `${stage.description}\n\n`;
      
      if (stage.components.length > 0) {
        markdown += `| Component | Description | Dependencies | Status |\n`;
        markdown += `|-----------|-------------|--------------|--------|\n`;
        
        stage.components.forEach(component => {
          const dependencies = component.dependencies.length > 0 
            ? component.dependencies.join(', ') 
            : 'None';
          
          markdown += `| **${component.name}** | ${component.description} | ${dependencies} | ${formatStatus(component.status)} |\n`;
        });
        
        markdown += '\n';
      } else {
        markdown += 'No components defined for this stage.\n\n';
      }
    });
    
    // Add verification strategy
    markdown += `## Verification Strategy

### Unit Tests

`;
    
    if (plan.verificationStrategy.unitTests.length > 0) {
      plan.verificationStrategy.unitTests.forEach(test => {
        markdown += `- ${test}\n`;
      });
    } else {
      markdown += 'No unit tests defined.\n';
    }
    
    markdown += `\n### Integration Tests

`;
    
    if (plan.verificationStrategy.integrationTests.length > 0) {
      plan.verificationStrategy.integrationTests.forEach(test => {
        markdown += `- ${test}\n`;
      });
    } else {
      markdown += 'No integration tests defined.\n';
    }
    
    markdown += `\n### Validation Experiments

`;
    
    if (plan.verificationStrategy.validationExperiments.length > 0) {
      plan.verificationStrategy.validationExperiments.forEach(experiment => {
        markdown += `#### ${experiment.name}\n\n`;
        markdown += `${experiment.description}\n\n`;
        markdown += `**Expected Results:** ${experiment.expectedResults}\n\n`;
      });
    } else {
      markdown += 'No validation experiments defined.\n';
    }
    
    markdown += `## Implementation Guidelines

1. **Start Simple**: Begin with the simplest version of each component
2. **Test Thoroughly**: Write tests before or alongside implementation
3. **Maintain Paper Fidelity**: Ensure the implementation accurately reflects the paper
4. **Document Decisions**: Note any deviations from the paper or design decisions
5. **Follow Dependencies**: Complete dependencies before moving to dependent components

## Challenges and Solutions

- **Ambiguous Descriptions**: Consult references or implement multiple versions for comparison
- **Missing Details**: Make reasonable assumptions and document them
- **Complex Algorithms**: Break down into smaller, testable components
- **Performance Issues**: Implement a working version first, then optimize
`;
    
    return markdown;
  } catch (error) {
    logger.error(`Error formatting implementation plan: ${plan.title}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return `# Error formatting implementation plan: ${plan.title}`;
  }
}

/**
 * Parse an implementation plan from markdown
 * @param markdown Markdown string
 * @returns Implementation plan
 */
export function parseImplementationPlan(markdown: string): PaperImplementationPlan {
  try {
    logger.info('Parsing implementation plan from markdown');
    
    // Extract frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    
    // Extract title and id
    const titleMatch = frontmatter.match(/title: "([^"]*)"/);
    const idMatch = frontmatter.match(/id: "([^"]*)"/);
    
    const title = titleMatch ? titleMatch[1] : 'Unknown Implementation Plan';
    const id = idMatch ? idMatch[1] : 'unknown-plan';
    
    // Parse stages
    const stagesMatch = markdown.match(/## Implementation Stages\s*\n\n([\s\S]*?)(?=##|$)/);
    const stagesText = stagesMatch ? stagesMatch[1] : '';
    
    const stageMatches = [...stagesText.matchAll(/### (.*?)\s*\n\n(.*?)\s*\n\n(?:\| Component \| Description \| Dependencies \| Status \|\n\|[\-]+\|[\-]+\|[\-]+\|[\-]+\|\n)((?:\|[^\n]*\|\n)*)(?=###|$)/g)];
    
    const stages = stageMatches.map((match, index) => {
      const name = match[1];
      const description = match[2];
      const componentsTable = match[3];
      
      // Parse components from the table
      const componentRows = componentsTable.split('\n').filter(row => row.startsWith('|') && row.includes('|'));
      
      const components = componentRows.map((row, componentIndex) => {
        // Extract cells from the table row
        const cells = row.split('|').filter(cell => cell.trim().length > 0);
        
        if (cells.length < 4) {
          return null;
        }
        
        const nameMatch = cells[0].match(/\*\*(.*?)\*\*/);
        const componentName = nameMatch ? nameMatch[1] : cells[0].trim();
        const description = cells[1].trim();
        const dependencies = cells[2].trim() === 'None' ? [] : cells[2].split(',').map(d => d.trim());
        const statusText = cells[3].trim();
        
        // Parse status
        let status: 'notStarted' | 'inProgress' | 'implemented' | 'verified' = 'notStarted';
        if (statusText.includes('In Progress')) {
          status = 'inProgress';
        } else if (statusText.includes('Implemented')) {
          status = 'implemented';
        } else if (statusText.includes('Verified')) {
          status = 'verified';
        }
        
        return {
          id: `component-${index + 1}-${componentIndex + 1}`,
          name: componentName,
          description,
          conceptIds: [],
          dependencies,
          status
        };
      }).filter(Boolean) as any[];
      
      return {
        id: `stage-${index + 1}`,
        name,
        description,
        components
      };
    });
    
    // Parse verification strategy
    const unitTestsMatch = markdown.match(/### Unit Tests\s*\n\n((?:- .*?\n)+|No unit tests defined\.)/);
    const unitTestsText = unitTestsMatch ? unitTestsMatch[1] : '';
    const unitTests = unitTestsText.includes('No unit tests defined') 
      ? [] 
      : [...unitTestsText.matchAll(/- (.*?)\n/g)].map(match => match[1]);
    
    const integrationTestsMatch = markdown.match(/### Integration Tests\s*\n\n((?:- .*?\n)+|No integration tests defined\.)/);
    const integrationTestsText = integrationTestsMatch ? integrationTestsMatch[1] : '';
    const integrationTests = integrationTestsText.includes('No integration tests defined') 
      ? [] 
      : [...integrationTestsText.matchAll(/- (.*?)\n/g)].map(match => match[1]);
    
    const experimentsMatch = markdown.match(/### Validation Experiments\s*\n\n([\s\S]*?)(?=##|$)/);
    const experimentsText = experimentsMatch ? experimentsMatch[1] : '';
    
    const experimentMatches = experimentsText.includes('No validation experiments defined')
      ? []
      : [...experimentsText.matchAll(/#### (.*?)\s*\n\n(.*?)\s*\n\n\*\*Expected Results:\*\* (.*?)\s*\n\n/g)];
    
    const validationExperiments = experimentMatches.map(match => ({
      name: match[1],
      description: match[2],
      expectedResults: match[3]
    }));
    
    return {
      id,
      title,
      stages,
      verificationStrategy: {
        unitTests,
        integrationTests,
        validationExperiments
      }
    };
  } catch (error) {
    logger.error('Error parsing implementation plan from markdown', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return a minimal plan
    return {
      id: 'error-plan',
      title: 'Error Parsing Implementation Plan',
      stages: [],
      verificationStrategy: {
        unitTests: [],
        integrationTests: [],
        validationExperiments: []
      }
    };
  }
}

/**
 * Update the implementation progress in the plan
 * @param plan Implementation plan
 * @param updates Component status updates
 * @returns Updated implementation plan
 */
export function updateImplementationProgress(
  plan: PaperImplementationPlan,
  updates: {
    componentId: string;
    status: 'notStarted' | 'inProgress' | 'implemented' | 'verified';
    notes?: string;
  }[]
): PaperImplementationPlan {
  try {
    logger.info('Updating implementation progress', { 
      updates: updates.length 
    });
    
    // Clone the plan to avoid modifying the original
    const updatedPlan: PaperImplementationPlan = {
      ...plan,
      stages: [...plan.stages.map(stage => ({
        ...stage,
        components: [...stage.components]
      }))]
    };
    
    // Apply updates
    updates.forEach(update => {
      // Find the component in any stage
      for (const stage of updatedPlan.stages) {
        const componentIndex = stage.components.findIndex(comp => comp.id === update.componentId);
        
        if (componentIndex >= 0) {
          // Update the component status
          stage.components[componentIndex] = {
            ...stage.components[componentIndex],
            status: update.status
          };
          
          // If notes are provided, add them as a property
          if (update.notes) {
            (stage.components[componentIndex] as any).notes = update.notes;
          }
          
          break;
        }
      }
    });
    
    return updatedPlan;
  } catch (error) {
    logger.error('Error updating implementation progress', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return the original plan
    return plan;
  }
}

/**
 * Format a component status for display
 * @param status Component status
 * @returns Formatted status string
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'notStarted':
      return '⬜ Not Started';
    case 'inProgress':
      return '🟡 In Progress';
    case 'implemented':
      return '🟢 Implemented';
    case 'verified':
      return '✅ Verified';
    default:
      return status;
  }
}