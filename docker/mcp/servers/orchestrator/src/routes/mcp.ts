/**
 * MCP (Model Context Protocol) route for Orchestrator
 * Forwards requests to the appropriate MCP server
 */

import { Router, Request, Response } from 'express';
import { logger, logError } from '../utils/logger';
import { forwardRequest, getAllCapabilities } from '../services/proxy';

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
