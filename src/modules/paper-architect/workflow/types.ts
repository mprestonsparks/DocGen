/**
 * Types for workflow management
 */

import { PaperContent } from '../extraction/types';
import { KnowledgeGraph } from '../knowledge/types';
import { ComponentSpecification } from '../specifications/types';
import { TraceabilityMatrix } from '../traceability/types';

export interface WorkflowOptions {
  mode: 'sequential' | 'parallel' | 'hybrid';
  validateSteps: boolean;
  generateArtifacts: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'extraction' | 'knowledge' | 'specification' | 'implementation' | 'validation';
  status: 'pending' | 'running' | 'completed' | 'failed';
  dependencies: string[];
  artifacts: Array<{
    type: string;
    path: string;
  }>;
  metadata: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
  };
}

export interface WorkflowState {
  steps: WorkflowStep[];
  currentStep?: string;
  artifacts: Array<{
    id: string;
    type: string;
    path: string;
    stepId: string;
    timestamp: string;
  }>;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface ValidationResult {
  stepId: string;
  isValid: boolean;
  issues: string[];
  metrics: Record<string, number>;
}

export interface WorkflowReport {
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDuration: number;
  };
  steps: Array<{
    step: WorkflowStep;
    validation?: ValidationResult;
  }>;
  artifacts: WorkflowState['artifacts'];
}
