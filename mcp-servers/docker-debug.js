/**
 * Simple debugging script for Docker MCP issues
 */

// This is an ES Module
import http from 'http';

// Function to make an HTTP request and log the response
async function testEndpoint(url) {
  console.log(`Testing endpoint: ${url}`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    });
    
    console.log(`Status code: ${response.statusCode}`);
    console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`);
    console.log(`Data: ${response.data.substring(0, 500)}`);
    
    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('--- MCP Endpoint Testing ---');
  
  // Test GitHub MCP endpoints
  console.log('\n--- GitHub MCP ---');
  await testEndpoint('http://localhost:7866');
  await testEndpoint('http://localhost:7866/capabilities');
  await testEndpoint('http://localhost:7866/ping');
  
  // Test Coverage MCP endpoints
  console.log('\n--- Coverage MCP ---');
  await testEndpoint('http://localhost:7865');
  await testEndpoint('http://localhost:7865/capabilities');
  await testEndpoint('http://localhost:7865/ping');
  
  // Test GitHub REST API endpoints
  console.log('\n--- GitHub REST API ---');
  await testEndpoint('http://localhost:7867');
  await testEndpoint('http://localhost:7867/capabilities');
  
  // Test Coverage REST API endpoints
  console.log('\n--- Coverage REST API ---');
  await testEndpoint('http://localhost:7868');
  await testEndpoint('http://localhost:7868/capabilities');
  
  console.log('\nDone.');
}

// Run the main function
main().catch(console.error);