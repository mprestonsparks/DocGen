/**
 * MCP Bridge Server
 * 
 * This bridge server implements the stdio transport interface that Windsurf expects
 * and forwards requests to our Docker-based HTTP MCP servers.
 */

import * as readline from 'readline';
import axios from 'axios';

// Configuration from environment variables
const MCP_ORCHESTRATOR_URL = process.env.MCP_ORCHESTRATOR_URL || 'http://localhost:8080/mcp';
const MCP_API_KEY = process.env.MCP_API_KEY || 'development_key';

// Create readline interface for stdio communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Initialize the bridge
console.error('MCP Bridge Server starting...');
console.error(`Connecting to MCP server at: ${MCP_ORCHESTRATOR_URL}`);

// Process incoming requests from Windsurf (via stdin)
rl.on('line', async (line) => {
  try {
    // Parse the incoming JSON-RPC request
    const request = JSON.parse(line);
    console.error(`Received request: ${request.method}`);

    // Forward the request to the HTTP MCP server
    const response = await axios.post(
      MCP_ORCHESTRATOR_URL,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': MCP_API_KEY
        },
        timeout: 300000 // 5 minute timeout for long-running operations
      }
    );

    // Send the response back to Windsurf (via stdout)
    console.log(JSON.stringify(response.data));
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Construct an error response in JSON-RPC format
    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      id: null
    };
    
    // If we can extract the original request ID, include it in the response
    try {
      const request = JSON.parse(line);
      errorResponse.id = request.id;
    } catch (e) {
      // If we can't parse the request, leave id as null
    }
    
    // Send the error response back to Windsurf
    console.log(JSON.stringify(errorResponse));
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.error('Bridge server shutting down...');
  rl.close();
  process.exit(0);
});

// Log startup completion
console.error('MCP Bridge Server ready to process requests');
