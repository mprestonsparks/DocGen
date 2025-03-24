/**
 * Traceability management module
 * 
 * This module handles the traceability between paper content, knowledge graphs,
 * specifications, and implementations, ensuring complete coverage and tracking.
 */

import { PaperContent } from '../extraction/types';
import { KnowledgeGraph } from '../knowledge/types';
import { ComponentSpecification } from '../specifications/types';
import {
  TraceabilityOptions,
  TraceabilityMatrix,
  TraceLink,
  ImplementationTrace,
  DocumentationTrace
} from './types';

// Re-export types
export * from './types';

// Export core functionality
export {
  generateTraceabilityMatrix,
  addTraceLink,
  findTraceGaps,
  validateTraceability
} from './core';

// Export implementation tracing
export {
  traceImplementation,
  updateImplementationTraces,
  generateImplementationReport
} from './implementation';

// Export documentation tracing
export {
  traceDocumentation,
  updateDocumentationTraces,
  generateDocumentationReport
} from './documentation';
