/**
 * Core knowledge modeling functionality
 */

import * as logger from '@utils/logger';
import { isLLMApiAvailable, callLLM } from '@utils/llm';
import { generateUniqueId, extractJson } from '@utils/index';
import { PaperContent } from '../extraction';
import {
  PaperKnowledgeGraph,
  PaperConcept,
  PaperConceptRelationship
} from './types';

/**
 * Generate a knowledge model from paper content
 */
export async function generateKnowledgeModel(paperContent: PaperContent): Promise<PaperKnowledgeGraph> {
  try {
    logger.info('Generating knowledge model');
    
    // Extract concepts from different paper elements
    const concepts = await extractConcepts(paperContent);
    
    // Identify relationships between concepts
    const relationships = await identifyRelationships(concepts, paperContent);
    
    return {
      concepts,
      relationships
    };
  } catch (error: unknown) {
    logger.error('Error generating knowledge model', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return a minimal knowledge graph
    return {
      concepts: [],
      relationships: []
    };
  }
}

/**
 * Extract concepts from paper content
 */
async function extractConcepts(paperContent: PaperContent): Promise<PaperConcept[]> {
  try {
    logger.info('Extracting concepts from paper content');
    
    const concepts: PaperConcept[] = [];
    
    // Extract concepts from algorithms
    const algorithmConcepts = paperContent.algorithms.map(algorithm => {
      return {
        id: generateUniqueId('concept', algorithm.name),
        name: algorithm.name,
        description: algorithm.description,
        type: 'algorithm' as const,
        sourceElements: [algorithm.id]
      };
    });
    concepts.push(...algorithmConcepts);
    
    // If LLM is available, enhance concept extraction
    if (isLLMApiAvailable()) {
      // Extract additional concepts using LLM
      const llmConcepts = await extractConceptsWithLLM(paperContent);
      concepts.push(...llmConcepts);
    } else {
      // Fallback: Basic extraction from sections
      const sectionConcepts = extractConceptsFromSections(paperContent);
      concepts.push(...sectionConcepts);
    }
    
    // Enhance concepts with domain knowledge
    const enhancedConcepts = await enhanceWithDomainKnowledge(concepts);
    
    return enhancedConcepts;
  } catch (error: unknown) {
    logger.error('Error extracting concepts', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Extract concepts using LLM
 */
async function extractConceptsWithLLM(paperContent: PaperContent): Promise<PaperConcept[]> {
  try {
    logger.info('Extracting concepts with LLM');
    
    // Create a text representation of the paper for the LLM to analyze
    let paperText = `Title: ${paperContent.info.title}\n`;
    paperText += `Abstract: ${paperContent.info.abstract}\n\n`;
    
    // Add sections
    paperContent.sections.forEach(section => {
      paperText += `## ${section.title}\n${section.content}\n\n`;
    });
    
    // Create prompt for LLM
    const prompt = `
      I need to identify key concepts from an academic paper to build a knowledge graph for implementation.
      
      Here's a summary of the paper:
      ${paperText.substring(0, 4000)}... [truncated]
      
      Please identify:
      1. Algorithms described in the paper
      2. Methods or techniques used
      3. Data structures mentioned
      4. Key parameters or configuration values
      5. Core concepts that are essential to understand
      
      Return your answer as JSON in this format:
      {
        "concepts": [
          {
            "name": "Concept name",
            "description": "Brief description",
            "type": "algorithm|method|dataStructure|parameter|concept"
          }
        ]
      }
    `;
    
    // Get response from LLM
    const response = await callLLM(prompt);
    
    // Parse concepts from response
    try {
      // Extract JSON from the response
      const jsonStr = extractJson(response.content);
      if (!jsonStr) {
        throw new Error('No JSON found in LLM response');
      }
      
      const data = JSON.parse(jsonStr);
      
      // Convert to PaperConcept format
      return data.concepts.map((concept: any) => ({
        id: generateUniqueId('concept', concept.name),
        name: concept.name,
        description: concept.description,
        type: concept.type,
        sourceElements: [],
        domain: determineDomain(concept),
        category: determineCategory(concept)
      }));
    } catch (error: unknown) {
      logger.error('Error parsing LLM response', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  } catch (error: unknown) {
    logger.error('Error extracting concepts with LLM', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Extract concepts from sections (fallback method)
 */
function extractConceptsFromSections(paperContent: PaperContent): PaperConcept[] {
  const concepts: PaperConcept[] = [];
  
  // Simple keyword-based extraction
  const keywords = [
    'algorithm',
    'method',
    'technique',
    'structure',
    'parameter',
    'configuration'
  ];
  
  paperContent.sections.forEach(section => {
    const words = section.content.split(/\s+/);
    const potentialConcepts = words.filter(word => 
      keywords.some(keyword => word.toLowerCase().includes(keyword))
    );
    
    potentialConcepts.forEach(concept => {
      concepts.push({
        id: generateUniqueId('concept', concept),
        name: concept,
        description: `Found in section: ${section.title}`,
        type: 'concept',
        sourceElements: [section.id]
      });
    });
  });
  
  return concepts;
}

/**
 * Identify relationships between concepts
 */
async function identifyRelationships(
  concepts: PaperConcept[],
  paperContent: PaperContent
): Promise<PaperConceptRelationship[]> {
  try {
    logger.info('Identifying relationships between concepts');
    
    const relationships: PaperConceptRelationship[] = [];
    
    // If LLM is available, use it to identify relationships
    if (isLLMApiAvailable()) {
      const llmRelationships = await identifyRelationshipsWithLLM(concepts, paperContent);
      relationships.push(...llmRelationships);
    } else {
      // Fallback: Basic relationship identification
      const algorithmConcepts = concepts.filter(c => c.type === 'algorithm');
      const methodConcepts = concepts.filter(c => c.type === 'method');
      
      // Create simple "uses" relationships
      algorithmConcepts.forEach(algorithm => {
        methodConcepts.forEach(method => {
          if (paperContent.sections.some(section => {
            // If algorithm and method are mentioned in the same section, assume a relationship
            return section.content.includes(algorithm.name) && section.content.includes(method.name);
          })) {
            relationships.push({
              id: generateUniqueId('rel', `${algorithm.id}_${method.id}`),
              sourceId: algorithm.id,
              targetId: method.id,
              type: 'uses',
              description: `${algorithm.name} uses ${method.name}`
            });
          }
        });
      });
    }
    
    return relationships;
  } catch (error: unknown) {
    logger.error('Error identifying relationships', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Identify relationships using LLM
 */
async function identifyRelationshipsWithLLM(
  concepts: PaperConcept[],
  paperContent: PaperContent
): Promise<PaperConceptRelationship[]> {
  try {
    logger.info('Identifying relationships with LLM');
    
    // Create a prompt with concepts and paper content
    const prompt = `
      I need to identify relationships between concepts in an academic paper.
      
      Here are the concepts:
      ${concepts.map(c => `- ${c.name} (${c.type}): ${c.description}`).join('\n')}
      
      Here's the paper content:
      ${paperContent.sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n')}
      
      Please identify relationships between these concepts. Consider:
      1. Dependencies (A depends on B)
      2. Usage (A uses B)
      3. Composition (A contains B)
      4. Inheritance (A is a type of B)
      5. Association (A is related to B)
      
      Return your answer as JSON in this format:
      {
        "relationships": [
          {
            "source": "Concept A name",
            "target": "Concept B name",
            "type": "relationship type",
            "description": "description of relationship",
            "evidence": ["supporting text from paper"]
          }
        ]
      }
    `;
    
    const response = await callLLM(prompt);
    
    try {
      const jsonStr = extractJson(response.content);
      if (!jsonStr) {
        throw new Error('No JSON found in LLM response');
      }
      
      const data = JSON.parse(jsonStr);
      
      // Convert to PaperConceptRelationship format
      return data.relationships.map((rel: any) => {
        const sourceConcept = concepts.find(c => c.name === rel.source);
        const targetConcept = concepts.find(c => c.name === rel.target);
        
        if (!sourceConcept || !targetConcept) {
          return null;
        }
        
        return {
          id: generateUniqueId('rel', `${sourceConcept.id}_${targetConcept.id}`),
          sourceId: sourceConcept.id,
          targetId: targetConcept.id,
          type: rel.type,
          description: rel.description,
          evidence: rel.evidence
        };
      }).filter(Boolean) as PaperConceptRelationship[];
    } catch (error: unknown) {
      logger.error('Error parsing LLM response for relationships', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  } catch (error: unknown) {
    logger.error('Error identifying relationships with LLM', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Determine the computer science domain for a concept
 */
function determineDomain(concept: PaperConcept): string {
  // Basic domain classification based on keywords
  const domainKeywords: Record<string, string[]> = {
    'algorithms': ['sort', 'search', 'optimization', 'complexity'],
    'dataStructures': ['tree', 'graph', 'list', 'queue', 'stack'],
    'machineLearning': ['model', 'training', 'neural', 'classification'],
    'networking': ['protocol', 'network', 'packet', 'routing'],
    'security': ['encryption', 'authentication', 'security', 'privacy'],
    'databases': ['query', 'database', 'sql', 'nosql'],
    'systems': ['operating', 'kernel', 'memory', 'process']
  };
  
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(keyword => 
      concept.name.toLowerCase().includes(keyword) || 
      concept.description.toLowerCase().includes(keyword)
    )) {
      return domain;
    }
  }
  
  return 'general';
}

/**
 * Determine the category within a domain for a concept
 */
function determineCategory(concept: PaperConcept): string {
  // Basic category classification based on concept type and keywords
  switch (concept.type) {
    case 'algorithm':
      if (concept.description.toLowerCase().includes('sort')) {
        return 'sorting';
      } else if (concept.description.toLowerCase().includes('search')) {
        return 'searching';
      } else if (concept.description.toLowerCase().includes('optim')) {
        return 'optimization';
      }
      return 'general';
      
    case 'dataStructure':
      if (concept.name.toLowerCase().includes('tree')) {
        return 'trees';
      } else if (concept.name.toLowerCase().includes('graph')) {
        return 'graphs';
      } else if (concept.name.toLowerCase().includes('hash')) {
        return 'hashing';
      }
      return 'basic';
      
    case 'method':
      if (concept.description.toLowerCase().includes('recursive')) {
        return 'recursion';
      } else if (concept.description.toLowerCase().includes('parallel')) {
        return 'parallelism';
      }
      return 'general';
      
    default:
      return 'general';
  }
}

/**
 * Enhance concepts with domain knowledge
 */
async function enhanceWithDomainKnowledge(concepts: PaperConcept[]): Promise<PaperConcept[]> {
  try {
    logger.info('Enhancing concepts with domain knowledge');
    
    return await Promise.all(concepts.map(async concept => {
      try {
        // Map to standard CS ontology
        const ontologyMapping = await mapToOntology(concept);
        
        return {
          ...concept,
          ontologyMapping
        };
      } catch (error: unknown) {
        logger.warn('Error enhancing concept with domain knowledge', {
          error: error instanceof Error ? error.message : String(error),
          concept: concept.name
        });
        return concept;
      }
    }));
  } catch (error: unknown) {
    logger.error('Error enhancing concepts with domain knowledge', {
      error: error instanceof Error ? error.message : String(error)
    });
    return concepts;
  }
}

/**
 * Map concept to standard computer science ontology
 */
async function mapToOntology(concept: PaperConcept): Promise<{
  standardMapping: string;
  confidence: number;
  relatedConcepts: string[];
}> {
  // This would typically use a proper CS ontology service
  // For now, return a basic mapping
  return {
    standardMapping: concept.type === 'algorithm' ? 
      'http://example.org/cs-ontology/algorithm/' + concept.name.toLowerCase() :
      'http://example.org/cs-ontology/concept/' + concept.name.toLowerCase(),
    confidence: 0.8,
    relatedConcepts: []
  };
}
