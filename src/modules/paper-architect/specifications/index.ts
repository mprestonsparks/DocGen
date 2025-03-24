/**
 * Specification generation module
 * 
 * This module handles the generation of implementation specifications and plans
 * from paper content and knowledge graphs.
 */

import { PaperContent } from '../extraction/types';
import { KnowledgeGraph } from '../knowledge/types';
import {
  SpecificationOptions,
  ComponentSpecification,
  ImplementationPlan,
  DependencyGraph
} from './types';

// Re-export types
export * from './types';

// Export core functionality
export {
  generateSpecifications,
  generateImplementationPlan,
  generateDependencyGraph
} from './core';

// Export enhancement functionality
export {
  enhanceSpecificationsWithLLM,
  validateSpecificationsWithLLM,
  generateTestCasesWithLLM
} from './enhance';
