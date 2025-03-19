#!/usr/bin/env node
/**
 * MCP Proxy Server
 * 
 * This script acts as a proxy between Claude Code and the MCP servers.
 * It provides a simple stdio interface that Claude Code can use
 * without requiring external tools like curl.
 */
const http = require('http');
const { URL } = require('url');

// Get the server and URL from command line arguments
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:7867';

// Process input from stdin
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk.toString();
  
  // Check if input contains a complete JSON object or command
  if (input.trim()) {
    // Input is complete, send the request
    sendRequest(input, url);
    input = ''; // Clear input for next request
  }
});

// Send HTTP request to the MCP server
function sendRequest(data, serverUrl) {
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
  }
  
  // Create request
  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      // Output the response to stdout
      process.stdout.write(responseData);
      // Add a newline for better formatting
      process.stdout.write('\n');
    });
  });
  
  req.on('error', (error) => {
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
      req.write(jsonData);
    } catch (e) {
      // If not valid JSON, send as is
      req.write(data);
    }
  }
  
  req.end();
}

// Handle process events
process.on('SIGINT', () => {
  process.exit(0);
});

// If no stdin is provided, query capabilities immediately (useful for testing)
if (process.stdin.isTTY) {
  sendRequest('capabilities', url);
}