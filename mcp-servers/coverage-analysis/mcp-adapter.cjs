/**
 * MCP Adapter for Coverage Analysis Server
 * 
 * This adapter wraps our REST API server to implement the Model Context Protocol (MCP)
 * using JSON-RPC 2.0. It translates between the MCP protocol and our existing REST API.
 */

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Configure logger
const debugLogDir = path.join(__dirname, '../../logs/mcp-debug');
if (!fs.existsSync(debugLogDir)) {
  fs.mkdirSync(debugLogDir, { recursive: true });
}
const logFile = path.join(debugLogDir, 'coverage-mcp-adapter.log');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFile })
  ]
});

// Create express app for MCP adapter
const app = express();
app.use(bodyParser.json());

// Define our REST API base URL
const REST_API_BASE = 'http://localhost:7868';

// Define JSON-RPC error codes
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32000,
  SERVER_ERROR_END: -32099,
  UNAUTHORIZED: -32001,
  TIMEOUT: -32002,
  RESOURCE_NOT_FOUND: -32003
};

// Method mapping from MCP to our REST API
const methodMappings = {
  // Core MCP methods
  'initialize': handleInitialize,
  'shutdown': handleShutdown,
  
  // Coverage methods mapped to our REST endpoints
  'coverage.getCoverageMetrics': { endpoint: '/getCoverageMetrics', method: 'POST' },
  'coverage.getFileCoverage': { endpoint: '/getFileCoverage', method: 'POST' },
  'coverage.generateCoverageReport': { endpoint: '/generateCoverageReport', method: 'POST' },
  'coverage.analyzeIssueImpact': { endpoint: '/analyzeIssueImpact', method: 'POST' },
  'coverage.getCoverageHistory': { endpoint: '/getCoverageHistory', method: 'POST' },
  'coverage.getImplementationGaps': { endpoint: '/getImplementationGaps', method: 'POST' },
  'coverage.correlateIssuesWithCoverage': { endpoint: '/correlateIssuesWithCoverage', method: 'POST' }
};

// Cache for server capabilities
let serverCapabilities = null;

/**
 * Main JSON-RPC handler
 */
app.post('/', async (req, res) => {
  const request = req.body;
  logger.info(`Received request: ${JSON.stringify(request)}`);
  
  // Check for valid JSON-RPC 2.0 request
  if (!request || typeof request !== 'object' || request.jsonrpc !== '2.0') {
    return sendErrorResponse(res, null, ErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request');
  }
  
  // Extract request properties
  const { id, method, params } = request;
  
  // Handle method not found
  if (!method || typeof method !== 'string') {
    return sendErrorResponse(res, id, ErrorCodes.INVALID_REQUEST, 'Method is required');
  }
  
  // Get the handler for this method
  const handler = methodMappings[method];
  
  if (!handler) {
    return sendErrorResponse(res, id, ErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
  
  try {
    // If this is a function handler, call it directly
    if (typeof handler === 'function') {
      const result = await handler(params, id);
      return sendSuccessResponse(res, id, result);
    } 
    
    // Otherwise, it's a REST API mapping
    const { endpoint, method: httpMethod } = handler;
    const result = await callRestApi(endpoint, httpMethod, params);
    return sendSuccessResponse(res, id, result);
  } catch (error) {
    logger.error(`Error handling method ${method}: ${error.message}`);
    return sendErrorResponse(
      res, 
      id, 
      ErrorCodes.SERVER_ERROR_START, 
      error.message || 'Server error',
      { stack: error.stack }
    );
  }
});

/**
 * Handle initialize method
 */
async function handleInitialize(params, id) {
  logger.info(`Initializing MCP with params: ${JSON.stringify(params)}`);
  
  // Validate required parameters
  if (!params || !params.protocolVersion) {
    logger.error('Missing required parameter: protocolVersion');
    throw {
      code: ErrorCodes.INVALID_PARAMS,
      message: 'Invalid params: protocolVersion is required',
      data: {
        errors: [
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['protocolVersion'],
            message: 'Required'
          }
        ]
      }
    };
  }
  
  // Fetch the capabilities from our REST API
  try {
    // Cache the capabilities
    serverCapabilities = await fetchServerCapabilities();
    
    // Build the MCP initialize response
    return {
      serverInfo: {
        name: serverCapabilities?.name || 'Coverage Analysis MCP',
        version: serverCapabilities?.version || '0.1.0'
      },
      capabilities: {
        methods: buildMethodsCapabilities(serverCapabilities)
      }
    };
  } catch (error) {
    logger.error(`Failed to initialize: ${error.message}`);
    throw error;
  }
}

/**
 * Handle shutdown method
 */
async function handleShutdown(params, id) {
  logger.info('Shutting down MCP server');
  return { success: true };
}

/**
 * Fetch capabilities from the REST API server
 */
async function fetchServerCapabilities() {
  try {
    return await new Promise((resolve, reject) => {
      http.get(`${REST_API_BASE}/capabilities`, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const capabilities = JSON.parse(data);
            resolve(capabilities);
          } catch (error) {
            reject(new Error(`Failed to parse capabilities response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to fetch capabilities: ${error.message}`));
      });
    });
  } catch (error) {
    logger.error(`Error fetching capabilities: ${error.message}`);
    throw error;
  }
}

/**
 * Convert REST API capabilities to MCP method capabilities
 */
function buildMethodsCapabilities(capabilities) {
  const methods = {};
  
  // Add core MCP methods
  methods['initialize'] = {
    description: 'Initialize the MCP server connection',
    params: {
      type: 'object',
      properties: {
        protocolVersion: { type: 'string' },
        capabilities: { type: 'object' },
        clientInfo: { 
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    },
    returns: {
      type: 'object',
      properties: {
        serverInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' }
          }
        },
        capabilities: {
          type: 'object',
          properties: {
            methods: { type: 'object' }
          }
        }
      }
    }
  };
  
  methods['shutdown'] = {
    description: 'Shut down the MCP server connection',
    params: { type: 'object' },
    returns: { 
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      }
    }
  };
  
  // Convert REST API capabilities to MCP method capabilities
  if (capabilities && capabilities.capabilities) {
    capabilities.capabilities.forEach(capability => {
      const methodName = `coverage.${capability.name}`;
      
      // Create method schema
      methods[methodName] = {
        description: capability.description || `Coverage ${capability.name} operation`,
        params: {
          type: 'object',
          properties: {}
        },
        returns: {
          type: 'object',
          description: `Results for ${capability.name}`
        }
      };
      
      // Add parameter schemas
      if (capability.parameters) {
        Object.entries(capability.parameters).forEach(([paramName, paramSchema]) => {
          methods[methodName].params.properties[paramName] = {
            type: paramSchema.type || 'string',
            description: paramSchema.description || '',
            default: paramSchema.default,
            optional: paramSchema.optional
          };
        });
      }
    });
  }
  
  return methods;
}

/**
 * Call our REST API
 */
async function callRestApi(endpoint, method, params) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 7868,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          // Handle error responses from the REST API
          if (response.success === false) {
            reject(new Error(response.error || 'Unknown error'));
            return;
          }
          
          // Extract the result data from the response
          // Assuming our REST API returns { success: true, ...data }
          const result = { ...response };
          delete result.success; // Remove success flag for MCP response
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    // Write request body if needed
    if (method !== 'GET' && params) {
      req.write(JSON.stringify(params));
    }
    
    req.end();
  });
}

/**
 * Send a success response in JSON-RPC 2.0 format
 */
function sendSuccessResponse(res, id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  
  logger.info(`Sending success response for id=${id}`);
  res.json(response);
}

/**
 * Send an error response in JSON-RPC 2.0 format
 */
function sendErrorResponse(res, id, code, message, data = null) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  };
  
  logger.info(`Sending error response: ${code} ${message} for id=${id}`);
  res.json(response);
}

// Start the server
const PORT = process.env.MCP_PORT || 7865;
app.listen(PORT, () => {
  logger.info(`MCP Coverage adapter running on port ${PORT}`);
  logger.info(`Forwarding requests to REST API at ${REST_API_BASE}`);
});

// Export for testing
module.exports = app;