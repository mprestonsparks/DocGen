#!/usr/bin/env node
/**
 * MCP Proxy Server with improved debugging and protocol handling
 * 
 * This script acts as a proxy between Claude Code and the MCP servers.
 * It provides a simple stdio interface that Claude Code can use
 * without requiring external tools like curl.
 */
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const zlib = require('zlib');

// Set up logging
const DEBUG = true;
const LOG_FILE = `/tmp/claude-mcp-proxy-${Date.now()}.log`;

function log(message) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
  }
}

// Get the server and URL from command line arguments
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:7867';

log(`Starting MCP proxy for ${url}`);

// MCP JSON-RPC request counter
let requestId = 1;

// Process input from stdin
let input = '';
process.stdin.on('data', (chunk) => {
  const str = chunk.toString();
  log(`Received stdin data: ${str.trim()}`);
  input += str;
  
  try {
    // Try to parse the input as JSON
    const parsedInput = JSON.parse(input.trim());
    log(`Parsed input as JSON: ${JSON.stringify(parsedInput)}`);
    
    // Handle MCP initialization - this is a special case
    if (parsedInput.method === 'initialize' && parsedInput.jsonrpc === '2.0') {
      log('Handling initialize request');
      handleInitialize(parsedInput, url);
    } else if (parsedInput.jsonrpc === '2.0') {
      // Handle other MCP requests
      log(`Handling MCP request: ${parsedInput.method}`);
      sendJsonRpcRequest(parsedInput, url);
    } else {
      // Handle REST API request
      log(`Handling REST API request`);
      sendRequest(input, url);
    }
    
    // Clear the input buffer
    input = '';
  } catch (e) {
    // If not valid JSON or not complete, wait for more data
    log(`Not a complete JSON object yet: ${e.message}`);
    
    // Check if it's a simple command like "capabilities"
    if (input.trim() === 'capabilities') {
      log('Detected capabilities request');
      sendRequest('capabilities', url);
      input = '';
    }
  }
});

// Handle initialize specially to ensure protocol compatibility
function handleInitialize(request, serverUrl) {
  log(`Handling initialize with params: ${JSON.stringify(request.params)}`);
  
  // Ensure required fields are present
  if (!request.params || !request.params.protocolVersion) {
    log('Missing required protocolVersion');
    
    // Respond with error
    const errorResponse = {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32602,
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
      }
    };
    
    process.stdout.write(JSON.stringify(errorResponse));
    process.stdout.write('\n');
    return;
  }
  
  // Forward the initialize request to the MCP server
  sendJsonRpcRequest(request, serverUrl);
}

// Send a JSON-RPC request to the MCP server
function sendJsonRpcRequest(request, serverUrl) {
  log(`Sending JSON-RPC request: ${JSON.stringify(request)} to ${serverUrl}`);
  
  // Parse the URL
  const parsedUrl = new URL(serverUrl);
  
  // Set up the HTTP request
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Create the request
  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      log(`Received response: ${responseData}`);
      
      try {
        // Try to parse the response as JSON
        const jsonResponse = JSON.parse(responseData);
        
        // Make sure the response is properly formatted for MCP
        if (!jsonResponse.jsonrpc) {
          // Add the jsonrpc version
          jsonResponse.jsonrpc = '2.0';
        }
        
        // Make sure the id matches the request
        if (!jsonResponse.id && request.id) {
          jsonResponse.id = request.id;
        }
        
        // Format the response
        const formattedResponse = JSON.stringify(jsonResponse);
        log(`Formatted response: ${formattedResponse}`);
        
        // Send the response to stdout
        process.stdout.write(formattedResponse);
        process.stdout.write('\n');
      } catch (e) {
        log(`Error parsing response: ${e.message}`);
        
        // If the response is not JSON, create a JSON-RPC response
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: 'Internal error',
            data: {
              message: 'Server response could not be parsed as JSON',
              response: responseData
            }
          }
        };
        
        process.stdout.write(JSON.stringify(errorResponse));
        process.stdout.write('\n');
      }
    });
  });
  
  req.on('error', (error) => {
    log(`Request error: ${error.message}`);
    
    // Create an error response
    const errorResponse = {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: {
          message: `Request failed: ${error.message}`
        }
      }
    };
    
    process.stdout.write(JSON.stringify(errorResponse));
    process.stdout.write('\n');
  });
  
  // Send the request
  req.write(JSON.stringify(request));
  req.end();
}

// Send HTTP request to the MCP server for REST API calls
function sendRequest(data, serverUrl) {
  log(`Sending REST API request: ${data} to ${serverUrl}`);
  
  // Parse the URL to get host, port and path
  const parsedUrl = new URL(serverUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // For simple GET requests to capabilities endpoint
  if (data.trim() === 'capabilities') {
    options.path = '/capabilities';
    options.method = 'GET';
    delete options.headers['Content-Type'];
    log(`Sending capabilities request: GET ${options.path}`);
  }
  
  // Create request
  log(`Making HTTP request: ${options.method} ${options.hostname}:${options.port}${options.path}`);
  const req = http.request(options, (res) => {
    log(`Received response with status: ${res.statusCode}`);
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      log(`Response complete: ${responseData.substring(0, 100)}...`);
      // Output the response to stdout
      process.stdout.write(responseData);
      // Add a newline for better formatting
      process.stdout.write('\n');
    });
  });
  
  req.on('error', (error) => {
    log(`Error: ${error.message}`);
    // Output error as JSON to maintain format compatibility
    const errorResponse = JSON.stringify({
      success: false,
      error: `Error connecting to MCP server: ${error.message}`
    });
    process.stdout.write(errorResponse);
    process.stdout.write('\n');
  });
  
  // If it's a POST request with data, send the data
  if (options.method === 'POST') {
    try {
      // Try to parse data as JSON if it isn't already
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      log(`Sending POST data: ${jsonData}`);
      req.write(jsonData);
    } catch (e) {
      log(`Error formatting request data: ${e.message}`);
      // If not valid JSON, send as is
      req.write(data);
    }
  }
  
  req.end();
  log('Request sent');
}

// Handle process events
process.on('SIGINT', () => {
  log('Process interrupted');
  process.exit(0);
});

// Log process exit
process.on('exit', (code) => {
  log(`Process exiting with code: ${code}`);
});

log('MCP proxy initialized and ready');

// Automatically send capabilities to make sure the proxy is working
sendRequest('capabilities', url);