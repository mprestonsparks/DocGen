/**
 * Workflow orchestration service for MCP Orchestrator
 * Coordinates the execution of the get-to-work workflow
 */

import { forwardRequest } from './proxy';
import { logger, logError } from '../utils/logger';

// Type definitions for workflow orchestration
export interface WorkflowPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
}

export interface WorkflowSession {
  id: string;
  owner: string;
  repo: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  phases: {
    testing: WorkflowPhase;
    issues: WorkflowPhase;
    todos: WorkflowPhase;
  };
  currentPhase?: 'testing' | 'issues' | 'todos';
  startTime: string;
  endTime?: string;
}

// In-memory store for workflow sessions
const workflowSessions: Record<string, WorkflowSession> = {};

/**
 * Create a new workflow session
 */
export const createWorkflowSession = async (
  owner: string,
  repo: string,
  sessionId: string
): Promise<WorkflowSession> => {
  try {
    // Create session
    const session: WorkflowSession = {
      id: sessionId,
      owner,
      repo,
      status: 'pending',
      phases: {
        testing: { name: 'Testing', status: 'pending' },
        issues: { name: 'Issues', status: 'pending' },
        todos: { name: 'TODOs', status: 'pending' }
      },
      startTime: new Date().toISOString()
    };
    
    // Store session
    workflowSessions[sessionId] = session;
    
    logger.info(`Created workflow session ${sessionId} for ${owner}/${repo}`);
    
    return session;
  } catch (error) {
    logError('Failed to create workflow session', error as Error);
    throw error;
  }
};

/**
 * Get workflow session
 */
export const getWorkflowSession = (
  sessionId: string
): WorkflowSession | null => {
  return workflowSessions[sessionId] || null;
};

/**
 * Execute testing phase
 */
export const executeTestingPhase = async (
  sessionId: string,
  directory: string = '',
  parallel: boolean = true
): Promise<WorkflowPhase> => {
  try {
    // Get session
    const session = workflowSessions[sessionId];
    
    if (!session) {
      throw new Error(`Workflow session ${sessionId} not found`);
    }
    
    // Update phase status
    session.currentPhase = 'testing';
    session.phases.testing.status = 'running';
    session.phases.testing.startTime = new Date().toISOString();
    session.status = 'running';
    
    logger.info(`Executing testing phase for session ${sessionId}`);
    
    try {
      // Discover tests
      const discoverResponse = await forwardRequest({
        method: 'test.discover',
        params: { directory },
        id: `${sessionId}-test-discover`
      });
      
      if (discoverResponse.error) {
        throw new Error(`Test discovery failed: ${discoverResponse.error.message}`);
      }
      
      const tests = discoverResponse.result;
      
      // Run tests
      const runResponse = await forwardRequest({
        method: 'test.run',
        params: { tests, directory, parallel },
        id: `${sessionId}-test-run`
      });
      
      if (runResponse.error) {
        throw new Error(`Test execution failed: ${runResponse.error.message}`);
      }
      
      const testResults = runResponse.result;
      
      // Analyze test failures
      if (testResults.failed > 0) {
        const analyzeResponse = await forwardRequest({
          method: 'test.analyze',
          params: { testResults },
          id: `${sessionId}-test-analyze`
        });
        
        if (!analyzeResponse.error) {
          testResults.analysis = analyzeResponse.result;
        }
      }
      
      // Update phase status
      session.phases.testing.status = 'completed';
      session.phases.testing.endTime = new Date().toISOString();
      session.phases.testing.result = testResults;
      
      logger.info(`Testing phase completed for session ${sessionId}`);
      
      return session.phases.testing;
    } catch (error) {
      // Update phase status
      session.phases.testing.status = 'failed';
      session.phases.testing.endTime = new Date().toISOString();
      session.phases.testing.error = error instanceof Error ? error.message : 'Unknown error';
      
      logError(`Testing phase failed for session ${sessionId}`, error as Error);
      
      return session.phases.testing;
    }
  } catch (error) {
    logError('Failed to execute testing phase', error as Error);
    throw error;
  }
};

/**
 * Execute issues phase
 */
export const executeIssuesPhase = async (
  sessionId: string
): Promise<WorkflowPhase> => {
  try {
    // Get session
    const session = workflowSessions[sessionId];
    
    if (!session) {
      throw new Error(`Workflow session ${sessionId} not found`);
    }
    
    // Update phase status
    session.currentPhase = 'issues';
    session.phases.issues.status = 'running';
    session.phases.issues.startTime = new Date().toISOString();
    
    logger.info(`Executing issues phase for session ${sessionId}`);
    
    try {
      // List open issues
      const listResponse = await forwardRequest({
        method: 'github.issues.list',
        params: { owner: session.owner, repo: session.repo, state: 'open' },
        id: `${sessionId}-issues-list`
      });
      
      if (listResponse.error) {
        throw new Error(`Issue listing failed: ${listResponse.error.message}`);
      }
      
      const issues = listResponse.result;
      
      // Analyze dependencies
      const dependenciesResponse = await forwardRequest({
        method: 'github.issues.analyzeDependencies',
        params: { owner: session.owner, repo: session.repo, issues },
        id: `${sessionId}-issues-dependencies`
      });
      
      if (dependenciesResponse.error) {
        throw new Error(`Dependency analysis failed: ${dependenciesResponse.error.message}`);
      }
      
      const dependencies = dependenciesResponse.result;
      
      // Prioritize issues
      const prioritizeResponse = await forwardRequest({
        method: 'github.issues.prioritize',
        params: { owner: session.owner, repo: session.repo, dependencies, issues },
        id: `${sessionId}-issues-prioritize`
      });
      
      if (prioritizeResponse.error) {
        throw new Error(`Issue prioritization failed: ${prioritizeResponse.error.message}`);
      }
      
      const prioritizedIssueIds = prioritizeResponse.result;
      
      // Create prioritized issues list
      const prioritizedIssues = prioritizedIssueIds.map((id: number) => 
        issues.find((issue: any) => issue.number === id)
      ).filter(Boolean);
      
      // Update phase status
      session.phases.issues.status = 'completed';
      session.phases.issues.endTime = new Date().toISOString();
      session.phases.issues.result = {
        issues,
        dependencies,
        prioritizedIssues
      };
      
      logger.info(`Issues phase completed for session ${sessionId}`);
      
      return session.phases.issues;
    } catch (error) {
      // Update phase status
      session.phases.issues.status = 'failed';
      session.phases.issues.endTime = new Date().toISOString();
      session.phases.issues.error = error instanceof Error ? error.message : 'Unknown error';
      
      logError(`Issues phase failed for session ${sessionId}`, error as Error);
      
      return session.phases.issues;
    }
  } catch (error) {
    logError('Failed to execute issues phase', error as Error);
    throw error;
  }
};

/**
 * Execute TODOs phase
 */
export const executeTODOsPhase = async (
  sessionId: string,
  directory: string = '',
  createIssues: boolean = true
): Promise<WorkflowPhase> => {
  try {
    // Get session
    const session = workflowSessions[sessionId];
    
    if (!session) {
      throw new Error(`Workflow session ${sessionId} not found`);
    }
    
    // Update phase status
    session.currentPhase = 'todos';
    session.phases.todos.status = 'running';
    session.phases.todos.startTime = new Date().toISOString();
    
    logger.info(`Executing TODOs phase for session ${sessionId}`);
    
    try {
      // Scan for TODOs
      const scanResponse = await forwardRequest({
        method: 'todo.scan',
        params: { directory },
        id: `${sessionId}-todos-scan`
      });
      
      if (scanResponse.error) {
        throw new Error(`TODO scanning failed: ${scanResponse.error.message}`);
      }
      
      const todos = scanResponse.result;
      
      // Categorize TODOs
      const categorizeResponse = await forwardRequest({
        method: 'todo.categorize',
        params: { todos },
        id: `${sessionId}-todos-categorize`
      });
      
      if (categorizeResponse.error) {
        throw new Error(`TODO categorization failed: ${categorizeResponse.error.message}`);
      }
      
      const categorizedTodos = categorizeResponse.result;
      
      // Find related TODOs
      const relatedResponse = await forwardRequest({
        method: 'todo.findRelated',
        params: { todos },
        id: `${sessionId}-todos-related`
      });
      
      const relatedTodos = relatedResponse.error ? {} : relatedResponse.result;
      
      // Create GitHub issues from TODOs if requested
      let createdIssues = [];
      
      if (createIssues && todos.length > 0) {
        const createResponse = await forwardRequest({
          method: 'github.issues.createFromTODOs',
          params: { 
            owner: session.owner, 
            repo: session.repo, 
            todos: todos.map((todo: any) => ({
              file: todo.file,
              line: todo.line,
              text: todo.text,
              category: todo.category
            }))
          },
          id: `${sessionId}-todos-create-issues`
        });
        
        if (!createResponse.error) {
          createdIssues = createResponse.result;
        }
      }
      
      // Update phase status
      session.phases.todos.status = 'completed';
      session.phases.todos.endTime = new Date().toISOString();
      session.phases.todos.result = {
        todos,
        categorizedTodos,
        relatedTodos,
        createdIssues
      };
      
      // Update workflow status if this is the last phase
      if (session.phases.testing.status !== 'pending' && 
          session.phases.issues.status !== 'pending') {
        session.status = 'completed';
        session.endTime = new Date().toISOString();
      }
      
      logger.info(`TODOs phase completed for session ${sessionId}`);
      
      return session.phases.todos;
    } catch (error) {
      // Update phase status
      session.phases.todos.status = 'failed';
      session.phases.todos.endTime = new Date().toISOString();
      session.phases.todos.error = error instanceof Error ? error.message : 'Unknown error';
      
      logError(`TODOs phase failed for session ${sessionId}`, error as Error);
      
      return session.phases.todos;
    }
  } catch (error) {
    logError('Failed to execute TODOs phase', error as Error);
    throw error;
  }
};

/**
 * Execute complete workflow
 */
export const executeWorkflow = async (
  owner: string,
  repo: string,
  sessionId: string,
  directory: string = ''
): Promise<WorkflowSession> => {
  try {
    // Create session
    const session = await createWorkflowSession(owner, repo, sessionId);
    
    // Execute testing phase
    await executeTestingPhase(sessionId, directory);
    
    // Execute issues phase
    await executeIssuesPhase(sessionId);
    
    // Execute TODOs phase
    await executeTODOsPhase(sessionId, directory);
    
    // Update workflow status
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    
    logger.info(`Workflow completed for session ${sessionId}`);
    
    return session;
  } catch (error) {
    // Get session
    const session = workflowSessions[sessionId];
    
    if (session) {
      session.status = 'failed';
      session.endTime = new Date().toISOString();
    }
    
    logError('Failed to execute workflow', error as Error);
    throw error;
  }
};
