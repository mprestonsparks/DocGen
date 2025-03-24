/**
 * Types for traceability management
 */

import { PaperContent } from '../extraction/types';
import { KnowledgeGraph } from '../knowledge/types';
import { ComponentSpecification } from '../specifications/types';

export interface TraceabilityOptions {
  granularity: 'file' | 'function' | 'line';
  includeTests: boolean;
  includeDocumentation: boolean;
}

export interface TraceLink {
  id: string;
  sourceType: 'paper' | 'knowledge' | 'specification' | 'implementation';
  sourceId: string;
  targetType: 'paper' | 'knowledge' | 'specification' | 'implementation';
  targetId: string;
  relationship: 'implements' | 'references' | 'tests' | 'documents';
  metadata: {
    confidence: number;
    rationale?: string;
    timestamp: string;
  };
}

export interface TraceabilityMatrix {
  links: TraceLink[];
  coverage: {
    paper: number;
    knowledge: number;
    specification: number;
    implementation: number;
  };
  gaps: Array<{
    type: 'missing_implementation' | 'missing_test' | 'missing_documentation';
    elementId: string;
    description: string;
  }>;
}

export interface ImplementationTrace {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  elementType: 'function' | 'class' | 'interface' | 'variable';
  elementName: string;
  links: TraceLink[];
}

export interface DocumentationTrace {
  elementId: string;
  documentationType: 'api' | 'guide' | 'example' | 'test';
  content: string;
  links: TraceLink[];
}
