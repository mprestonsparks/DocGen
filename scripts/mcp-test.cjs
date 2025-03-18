#!/usr/bin/env node
/**
 * MCP Adapter Test Script
 * Tests the MCP adapters by sending initialize and method calls
 */
const http = require('http');

// Helper function to make an HTTP request
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Test the GitHub MCP adapter
async function testGithubAdapter() {
  console.log('Testing GitHub MCP adapter...');
  
  try {
    // Initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test',
          version: '1.0.0'
        }
      }
    };
    
    const initResponse = await makeRequest('http://localhost:7866/', initRequest);
    console.log('GitHub initialize response:', JSON.stringify(initResponse, null, 2));
    
    // Test a GitHub method
    const methodRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'github.getIssues',
      params: {
        state: 'open'
      }
    };
    
    const methodResponse = await makeRequest('http://localhost:7866/', methodRequest);
    console.log('GitHub method response:', JSON.stringify(methodResponse, null, 2));
    
    return true;
  } catch (error) {
    console.error('GitHub MCP adapter test failed:', error.message);
    return false;
  }
}

// Test the Coverage MCP adapter
async function testCoverageAdapter() {
  console.log('Testing Coverage MCP adapter...');
  
  try {
    // Initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test',
          version: '1.0.0'
        }
      }
    };
    
    const initResponse = await makeRequest('http://localhost:7865/', initRequest);
    console.log('Coverage initialize response:', JSON.stringify(initResponse, null, 2));
    
    // Test a Coverage method
    const methodRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'coverage.getCoverageMetrics',
      params: {}
    };
    
    const methodResponse = await makeRequest('http://localhost:7865/', methodRequest);
    console.log('Coverage method response:', JSON.stringify(methodResponse, null, 2));
    
    return true;
  } catch (error) {
    console.error('Coverage MCP adapter test failed:', error.message);
    return false;
  }
}

// Run tests and report results
async function runTests() {
  console.log('Starting MCP adapter tests...');
  
  const githubResult = await testGithubAdapter();
  const coverageResult = await testCoverageAdapter();
  
  console.log('\nTest Results:');
  console.log('-----------------------------------------');
  console.log(`GitHub MCP Adapter: ${githubResult ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log(`Coverage MCP Adapter: ${coverageResult ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log('-----------------------------------------');
  
  if (githubResult && coverageResult) {
    console.log('All MCP adapters are working correctly! 🎉');
    process.exit(0);
  } else {
    console.log('Some MCP adapters are not working properly.');
    process.exit(1);
  }
}

// Execute tests
runTests();