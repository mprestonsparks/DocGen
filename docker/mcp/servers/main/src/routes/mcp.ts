/**
 * MCP (Model Context Protocol) route for Main MCP Server
 */

import { Router, Request, Response } from 'express';
import { logger, logError } from '../utils/logger';
import { 
  generateDocument,
  generateDocumentStream,
  completeCode,
  performSemanticAnalysis,
  processNaturalLanguage,
  DocumentGenerationStreamResponse
} from '../services/anthropic';
import {
  readFile,
  writeFile,
  listFiles,
  deleteFile
} from '../services/filesystem';
import {
  discoverTests,
  runTests,
  analyzeTestFailures,
  getTestHistory,
  identifyFlakyTests
} from '../services/testing';
import {
  scanTODOs,
  categorizeTODOs,
  findRelatedTODOs,
  updateTODO
} from '../services/todos';

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
    
    // Handle streaming requests
    if (method === 'document.generate.stream') {
      return handleStreamingDocumentGeneration(req, res);
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
        
      // File system operations
      case 'fs.readFile':
        result = await readFile(
          params?.path,
          params?.encoding
        );
        break;
        
      case 'fs.writeFile':
        result = await writeFile(
          params?.path,
          params?.content,
          params?.encoding
        );
        break;
        
      case 'fs.listFiles':
        result = await listFiles(
          params?.path,
          params?.recursive
        );
        break;
        
      case 'fs.deleteFile':
        result = await deleteFile(
          params?.path,
          params?.recursive
        );
        break;
        
      // Testing operations
      case 'test.discover':
        result = await discoverTests(
          params?.directory,
          params?.pattern
        );
        break;
        
      case 'test.run':
        result = await runTests(
          params?.tests,
          params?.directory,
          params?.parallel
        );
        break;
        
      case 'test.analyze':
        result = await analyzeTestFailures(
          params?.testResults
        );
        break;
        
      case 'test.history':
        result = await getTestHistory(
          params?.limit
        );
        break;
        
      case 'test.flaky':
        result = await identifyFlakyTests(
          params?.minRuns
        );
        break;
        
      // TODO operations
      case 'todo.scan':
        result = await scanTODOs(
          params?.directory,
          params?.includePatterns,
          params?.excludePatterns
        );
        break;
        
      case 'todo.categorize':
        result = await categorizeTODOs(
          params?.todos
        );
        break;
        
      case 'todo.findRelated':
        result = await findRelatedTODOs(
          params?.todos
        );
        break;
        
      case 'todo.update':
        result = await updateTODO(
          params?.file,
          params?.line,
          params?.newText
        );
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
 * Handle streaming document generation
 */
const handleStreamingDocumentGeneration = (req: Request, res: Response): void => {
  try {
    const { params, id } = req.body;
    
    if (!params?.prompt) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Invalid params: prompt is required'
        },
        id
      });
      return;
    }
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Generate document with streaming
    const stream = generateDocumentStream({
      prompt: params.prompt,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      topP: params.topP,
      stopSequences: params.stopSequences
    });
    
    // Send the initial response with the stream ID
    const initialResponse = {
      jsonrpc: '2.0',
      id,
      result: {
        id: stream.id,
        model: stream.model,
        streaming: true
      }
    };
    
    res.write(`data: ${JSON.stringify(initialResponse)}\n\n`);
    
    // Handle stream events
    stream.on('chunk', (chunk) => {
      const chunkResponse = {
        jsonrpc: '2.0',
        method: 'document.generate.chunk',
        params: {
          id: stream.id,
          chunk: chunk.text
        }
      };
      
      res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
    });
    
    stream.on('end', () => {
      const endResponse = {
        jsonrpc: '2.0',
        method: 'document.generate.end',
        params: {
          id: stream.id,
          completed: true
        }
      };
      
      res.write(`data: ${JSON.stringify(endResponse)}\n\n`);
      res.end();
    });
    
    stream.on('error', (error) => {
      const errorResponse = {
        jsonrpc: '2.0',
        method: 'document.generate.error',
        params: {
          id: stream.id,
          error: error.message
        }
      };
      
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    });
    
  } catch (error) {
    logError('Streaming document generation failed', error as Error);
    
    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      id: req.body.id || null
    };
    
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
};

/**
 * GET /mcp/capabilities
 * Returns the capabilities of this MCP server
 */
mcpRouter.get('/capabilities', (req: Request, res: Response) => {
  const capabilities = {
    document_generation: {
      version: '1.1',
      methods: ['document.generate', 'document.generate.stream']
    },
    code_assistance: {
      version: '1.0',
      methods: ['code.complete', 'semantic.analyze']
    },
    natural_language_processing: {
      version: '1.0',
      methods: ['nlp.process']
    },
    file_system_access: {
      version: '1.0',
      methods: ['fs.readFile', 'fs.writeFile', 'fs.listFiles', 'fs.deleteFile']
    },
    testing: {
      version: '1.0',
      methods: [
        'test.discover',
        'test.run',
        'test.analyze',
        'test.history',
        'test.flaky'
      ]
    },
    todo_management: {
      version: '1.0',
      methods: [
        'todo.scan',
        'todo.categorize',
        'todo.findRelated',
        'todo.update'
      ]
    },
    get_to_work_workflow: {
      version: '1.0',
      methods: [
        'test.discover',
        'test.run',
        'test.analyze',
        'todo.scan',
        'todo.categorize'
      ]
    }
  };
  
  return res.json(capabilities);
});
