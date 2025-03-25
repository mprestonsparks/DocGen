/**
 * MCP (Model Context Protocol) route for Main MCP Server
 */

import { Router, Request, Response } from 'express';
import { logger, logError } from '../utils/logger';
import { 
  generateDocument,
  completeCode,
  performSemanticAnalysis,
  processNaturalLanguage
} from '../services/anthropic';

export const mcpRouter = Router();

/**
 * POST /mcp
 * Main MCP endpoint that handles JSON-RPC style requests
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
    
    // Process request based on method
    let result;
    
    switch (method) {
      case 'document.generate':
        result = await generateDocument({
          prompt: params?.prompt,
          maxTokens: params?.maxTokens,
          temperature: params?.temperature,
          topP: params?.topP,
          stopSequences: params?.stopSequences
        });
        break;
        
      case 'code.complete':
        result = await completeCode({
          code: params?.code,
          language: params?.language,
          maxTokens: params?.maxTokens,
          temperature: params?.temperature
        });
        break;
        
      case 'semantic.analyze':
        result = await performSemanticAnalysis({
          text: params?.text,
          analysisType: params?.analysisType
        });
        break;
        
      case 'nlp.process':
        result = await processNaturalLanguage({
          text: params?.text,
          task: params?.task,
          options: params?.options
        });
        break;
        
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found'
          },
          id
        });
    }
    
    // Return successful response
    return res.json({
      jsonrpc: '2.0',
      result,
      id
    });
    
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
 * Returns the capabilities of this MCP server
 */
mcpRouter.get('/capabilities', (req: Request, res: Response) => {
  const capabilities = {
    document_generation: {
      version: '1.0',
      methods: ['document.generate']
    },
    code_completion: {
      version: '1.0',
      methods: ['code.complete']
    },
    semantic_analysis: {
      version: '1.0',
      methods: ['semantic.analyze']
    },
    natural_language_processing: {
      version: '1.0',
      methods: ['nlp.process']
    }
  };
  
  return res.json(capabilities);
});
