/**
 * MCP (Model Context Protocol) route for Orchestrator
 * Forwards requests to the appropriate MCP server
 */

import { Router, Request, Response } from 'express';
import { logger, logError } from '../utils/logger';
import { forwardRequest, getAllCapabilities } from '../services/proxy';
import { 
  createWorkflowSession, 
  getWorkflowSession, 
  executeTestingPhase, 
  executeIssuesPhase, 
  executeTODOsPhase, 
  executeWorkflow 
} from '../services/workflow';
import { v4 as uuidv4 } from 'uuid';

export const mcpRouter = Router();

/**
 * POST /mcp
 * Main MCP endpoint that forwards requests to the appropriate server
 */
mcpRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { method, params, id } = req.body;
    
    logger.info(`MCP request received: ${method}`, { id });
    
    // Validate request format
    if (!method || !id) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        },
        id: id || null
      });
    }
    
    // Handle workflow orchestration methods
    if (method.startsWith('workflow.')) {
      let result;
      
      switch (method) {
        case 'workflow.create':
          result = await createWorkflowSession(
            params?.owner,
            params?.repo,
            params?.sessionId || uuidv4()
          );
          break;
          
        case 'workflow.get':
          result = getWorkflowSession(params?.sessionId);
          if (!result) {
            return res.status(404).json({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: `Workflow session ${params?.sessionId} not found`
              },
              id
            });
          }
          break;
          
        case 'workflow.execute':
          result = await executeWorkflow(
            params?.owner,
            params?.repo,
            params?.sessionId || uuidv4(),
            params?.directory || ''
          );
          break;
          
        case 'workflow.testing.execute':
          result = await executeTestingPhase(
            params?.sessionId,
            params?.directory || '',
            params?.parallel !== false
          );
          break;
          
        case 'workflow.issues.execute':
          result = await executeIssuesPhase(params?.sessionId);
          break;
          
        case 'workflow.todos.execute':
          result = await executeTODOsPhase(
            params?.sessionId,
            params?.directory || '',
            params?.createIssues !== false
          );
          break;
          
        default:
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            },
            id
          });
      }
      
      return res.json({
        jsonrpc: '2.0',
        result,
        id
      });
    }
    
    // Forward request to appropriate server
    const response = await forwardRequest({
      method,
      params,
      id
    });
    
    // Return response
    return res.json(response);
  } catch (error) {
    // Log the error
    logError('MCP request failed', error as Error);
    
    // Return error response
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      id: req.body.id || null
    });
  }
});

/**
 * GET /mcp/capabilities
 * Returns the combined capabilities of all MCP servers
 */
mcpRouter.get('/capabilities', async (req: Request, res: Response) => {
  try {
    // Get capabilities from all servers
    const capabilities = await getAllCapabilities();
    
    // Add workflow orchestration capabilities
    capabilities.workflow = {
      version: '1.0',
      methods: [
        'workflow.create',
        'workflow.get',
        'workflow.execute',
        'workflow.testing.execute',
        'workflow.issues.execute',
        'workflow.todos.execute'
      ]
    };
    
    return res.json(capabilities);
  } catch (error) {
    // Log the error
    logError('Failed to get capabilities', error as Error);
    
    // Return error response
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});
