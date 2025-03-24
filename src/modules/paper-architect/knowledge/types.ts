/**
 * Types for knowledge graph generation
 */

import { PaperContent } from '../extraction/types';

export interface KnowledgeGraphOptions {
  depth: 'basic' | 'standard' | 'deep';
  includeReferences: boolean;
  outputFormat: 'json' | 'graphml' | 'dot';
}

export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'algorithm' | 'equation' | 'reference';
  label: string;
  properties: Record<string, any>;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  type: 'references' | 'implements' | 'uses' | 'extends';
  properties: Record<string, any>;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface ConceptExtraction {
  id: string;
  name: string;
  description: string;
  sectionId: string;
  relations: Array<{
    type: string;
    targetId: string;
  }>;
}

export interface RelationshipExtraction {
  sourceId: string;
  targetId: string;
  type: string;
  confidence: number;
  evidence: string;
}

/**
 * Knowledge modeling types
 */

/**
 * Paper concept types
 */
export type PaperConceptType = 'algorithm' | 'method' | 'dataStructure' | 'parameter' | 'concept';

/**
 * Paper concept relationship types
 */
export type PaperConceptRelationshipType = 'uses' | 'depends' | 'contains' | 'inherits' | 'associates';

/**
 * Paper concept interface
 */
export interface PaperConcept {
  id: string;
  name: string;
  description: string;
  type: PaperConceptType;
  sourceElements: string[];
  domain?: string;
  category?: string;
  ontologyMapping?: {
    standardMapping: string;
    confidence: number;
    relatedConcepts: string[];
  };
}

/**
 * Paper concept relationship interface
 */
export interface PaperConceptRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: PaperConceptRelationshipType;
  description: string;
  evidence?: string[];
}

/**
 * Paper knowledge graph interface
 */
export interface PaperKnowledgeGraph {
  concepts: PaperConcept[];
  relationships: PaperConceptRelationship[];
}
