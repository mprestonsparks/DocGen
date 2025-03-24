/**
 * Types for specification generation
 */

import { PaperContent } from '../extraction/types';
import { KnowledgeGraph } from '../knowledge/types';

export interface SpecificationOptions {
  language: string;
  templateFormat: 'markdown' | 'yaml' | 'json';
  detailLevel: 'basic' | 'standard' | 'detailed';
}

export interface TestCase {
  input: any;
  expectedOutput: any;
  description: string;
}

export interface ComponentSpecification {
  id: string;
  name: string;
  description: string;
  sourceElement: {
    id: string;
    type: string;
  };
  implementation: {
    language: string;
    pseudocode?: string;
    testCases?: TestCase[];
  };
}

export interface ImplementationPlan {
  overview: string;
  components: Array<{
    id: string;
    name: string;
    description: string;
    sourceElements: string[];
    dependencies: string[];
    estimatedComplexity: 'low' | 'medium' | 'high';
    implementationOrder: number;
  }>;
  timeline: Array<{
    phase: string;
    components: string[];
    estimatedDuration: string;
  }>;
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    name: string;
    type: 'component' | 'external' | 'interface';
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'requires' | 'implements' | 'uses';
  }>;
}
