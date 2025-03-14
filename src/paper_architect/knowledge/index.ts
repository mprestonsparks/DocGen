/**
 * Knowledge Modeling Module
 * 
 * This module is responsible for creating a formal knowledge model from
 * the extracted paper content. It identifies concepts, their relationships,
 * and maps them to a structured representation that can be used for 
 * implementation guidance.
 */

import * as logger from '../../utils/logger';
import * as llm from '../../utils/llm';
import * as utils from '../utils';

import {
  PaperContent,
  PaperKnowledgeGraph,
  PaperConcept,
  PaperConceptRelationship
} from '../../types';

/**
 * Generate a knowledge model from paper content
 * @param paperContent Extracted paper content
 * @returns Knowledge graph of the paper
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
  } catch (error) {
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
 * @param paperContent Extracted paper content
 * @returns Array of concepts
 */
async function extractConcepts(paperContent: PaperContent): Promise<PaperConcept[]> {
  try {
    logger.info('Extracting concepts from paper content');
    
    const concepts: PaperConcept[] = [];
    
    // Extract concepts from algorithms
    const algorithmConcepts = paperContent.algorithms.map(algorithm => {
      return {
        id: utils.generateUniqueId('concept', algorithm.name),
        name: algorithm.name,
        description: algorithm.description,
        type: 'algorithm' as const,
        sourceElements: [algorithm.id]
      };
    });
    concepts.push(...algorithmConcepts);
    
    // If LLM is available, enhance concept extraction
    if (llm.isLLMApiAvailable()) {
      // Extract additional concepts using LLM
      const llmConcepts = await extractConceptsWithLLM(paperContent);
      concepts.push(...llmConcepts);
    } else {
      // Fallback: Basic extraction from sections
      const sectionConcepts = extractConceptsFromSections(paperContent);
      concepts.push(...sectionConcepts);
    }
    
    return concepts;
  } catch (error) {
    logger.error('Error extracting concepts', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Identify relationships between concepts
 * @param concepts Array of concepts
 * @param paperContent Extracted paper content
 * @returns Array of concept relationships
 */
async function identifyRelationships(
  concepts: PaperConcept[],
  paperContent: PaperContent
): Promise<PaperConceptRelationship[]> {
  try {
    logger.info('Identifying relationships between concepts');
    
    const relationships: PaperConceptRelationship[] = [];
    
    // If LLM is available, use it to identify relationships
    if (llm.isLLMApiAvailable()) {
      const llmRelationships = await identifyRelationshipsWithLLM(concepts, paperContent);
      relationships.push(...llmRelationships);
    } else {
      // Fallback: Basic relationship identification
      // For now, just connect algorithms to methods they might use
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
              id: utils.generateUniqueId('rel', `${algorithm.id}_${method.id}`),
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
  } catch (error) {
    logger.error('Error identifying relationships', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Extract concepts from paper using LLM
 * @param paperContent Extracted paper content
 * @returns Array of concepts identified by LLM
 */
async function extractConceptsWithLLM(paperContent: PaperContent): Promise<PaperConcept[]> {
  try {
    logger.info('Extracting concepts with LLM');
    
    // Create a text representation of the paper for the LLM to analyze
    let paperText = `Title: ${paperContent.paperInfo.title}\n`;
    paperText += `Abstract: ${paperContent.paperInfo.abstract}\n\n`;
    
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
    const response = await llm.query(prompt);
    
    // Parse concepts from response
    try {
      // Extract JSON from the response
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim();
        const result = JSON.parse(jsonString);
        
        if (result.concepts && Array.isArray(result.concepts)) {
          // Convert to PaperConcept objects
          return result.concepts.map((concept: any) => ({
            id: utils.generateUniqueId('concept', concept.name),
            name: concept.name,
            description: concept.description,
            type: concept.type as 'algorithm' | 'method' | 'dataStructure' | 'parameter' | 'concept',
            sourceElements: [] // We don't have explicit source elements from LLM
          }));
        }
      }
    } catch (parseError) {
      logger.error('Error parsing LLM response for concepts', { 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
    }
    
    return [];
  } catch (error) {
    logger.error('Error extracting concepts with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Identify relationships between concepts using LLM
 * @param concepts Array of concepts
 * @param paperContent Extracted paper content
 * @returns Array of concept relationships identified by LLM
 */
async function identifyRelationshipsWithLLM(
  concepts: PaperConcept[],
  paperContent: PaperContent
): Promise<PaperConceptRelationship[]> {
  try {
    logger.info('Identifying relationships with LLM');
    
    if (concepts.length <= 1) {
      logger.info('Not enough concepts to identify relationships');
      return [];
    }
    
    // Create prompt for LLM
    const prompt = `
      I need to identify relationships between concepts from an academic paper.
      
      Paper title: ${paperContent.paperInfo.title}
      
      Here are the identified concepts:
      ${concepts.map(c => `- ${c.name} (${c.type}): ${c.description}`).join('\n')}
      
      Please identify relationships between these concepts, such as:
      - "uses" (one concept uses another)
      - "implements" (one concept implements another)
      - "extends" (one concept extends or builds upon another)
      - "dependsOn" (one concept depends on another)
      - "refines" (one concept refines or improves another)
      
      Return your answer as JSON in this format:
      {
        "relationships": [
          {
            "source": "Source concept name",
            "target": "Target concept name",
            "type": "uses|implements|extends|dependsOn|refines",
            "description": "Brief description of the relationship"
          }
        ]
      }
    `;
    
    // Get response from LLM
    const response = await llm.query(prompt);
    
    // Parse relationships from response
    try {
      // Extract JSON from the response
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim();
        const result = JSON.parse(jsonString);
        
        if (result.relationships && Array.isArray(result.relationships)) {
          // Convert to PaperConceptRelationship objects
          const conceptMap = new Map(concepts.map(c => [c.name.toLowerCase(), c]));
          
          return result.relationships
            .filter((rel: any) => {
              // Make sure both source and target concepts exist
              const sourceExists = conceptMap.has(rel.source.toLowerCase());
              const targetExists = conceptMap.has(rel.target.toLowerCase());
              
              if (!sourceExists) {
                logger.warn(`Relationship source concept not found: ${rel.source}`);
              }
              
              if (!targetExists) {
                logger.warn(`Relationship target concept not found: ${rel.target}`);
              }
              
              return sourceExists && targetExists;
            })
            .map((rel: any) => {
              const sourceConcept = conceptMap.get(rel.source.toLowerCase())!;
              const targetConcept = conceptMap.get(rel.target.toLowerCase())!;
              
              return {
                id: utils.generateUniqueId('rel', `${sourceConcept.id}_${targetConcept.id}`),
                sourceId: sourceConcept.id,
                targetId: targetConcept.id,
                type: rel.type as 'uses' | 'implements' | 'extends' | 'dependsOn' | 'refines',
                description: rel.description
              };
            });
        }
      }
    } catch (parseError) {
      logger.error('Error parsing LLM response for relationships', { 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
    }
    
    return [];
  } catch (error) {
    logger.error('Error identifying relationships with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Extract concepts from paper sections (fallback method)
 * @param paperContent Extracted paper content
 * @returns Array of concepts
 */
function extractConceptsFromSections(paperContent: PaperContent): PaperConcept[] {
  try {
    logger.info('Extracting concepts from sections (fallback method)');
    
    const concepts: PaperConcept[] = [];
    const conceptCandidates = new Set<string>();
    
    // Look for capitalized terms that might be concepts
    paperContent.sections.forEach(section => {
      // Extract potential concept names using regex
      // This is a simple heuristic that looks for capitalized multi-word terms
      const conceptMatches = section.content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
      
      if (conceptMatches) {
        conceptMatches.forEach(match => {
          conceptCandidates.add(match.trim());
        });
      }
    });
    
    // Convert candidates to concepts
    conceptCandidates.forEach(name => {
      // Only add if not too short and not already an algorithm
      if (name.length > 10 && !paperContent.algorithms.some(a => a.name === name)) {
        concepts.push({
          id: utils.generateUniqueId('concept', name),
          name,
          description: `Concept extracted from paper: ${name}`,
          type: 'concept',
          sourceElements: []
        });
      }
    });
    
    return concepts;
  } catch (error) {
    logger.error('Error extracting concepts from sections', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Map concept to standard computer science ontology
 * @param concept Paper concept
 * @returns Enhanced concept with ontology mapping
 */
export function mapToOntology(concept: PaperConcept): PaperConcept {
  // This is a placeholder for future ontology mapping functionality
  return concept;
}

/**
 * Find connections between paper concepts and domain knowledge
 * @param concepts Paper concepts
 * @returns Enhanced concepts with domain connections
 */
export function enhanceWithDomainKnowledge(concepts: PaperConcept[]): PaperConcept[] {
  // This is a placeholder for future domain knowledge enhancement
  return concepts;
}