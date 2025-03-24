/**
 * Workflow management module
 * 
 * This module handles the orchestration of the paper-architect pipeline,
 * managing the flow between extraction, knowledge graph generation,
 * specification generation, and traceability.
 */

import {
  WorkflowOptions,
  WorkflowState,
  WorkflowStep,
  ValidationResult,
  WorkflowReport
} from './types';

// Re-export types
export * from './types';

// Export core functionality
export {
  initializeWorkflow,
  executeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowState
} from './core';

// Export validation functionality
export {
  validateWorkflowStep,
  validateWorkflowState,
  generateWorkflowReport
} from './validation';

// Export artifact management
export {
  saveArtifact,
  loadArtifact,
  listArtifacts,
  cleanupArtifacts
} from './artifacts';
