#!/usr/bin/env node
/**
 * Docker-specific MCP server check
 * 
 * This script directly checks if MCP servers are running in Docker by making
 * HTTP requests to the servers without going through the mcp-server-manager.
 */

const http = require('http');

// Configuration
const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:7866';
const COVERAGE_MCP_URL = process.env.COVERAGE_MCP_URL || 'http://localhost:7865';

// Use 0.0.0.0 for listening to ensure Docker works
const LISTEN_HOST = '0.0.0.0';

// ANSI color codes for terminal output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

/**
 * Make an HTTP request to a URL with retries
 */
function makeRequest(url, retries = 3, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const tryRequest = (attemptsLeft) => {
      console.log(`Trying to connect to ${url}, attempts left: ${attemptsLeft}`);
      
      const req = http.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data
          });
        });
      });
      
      req.on('error', (err) => {
        console.log(`Error connecting to ${url}: ${err.message}`);
        if (attemptsLeft > 0) {
          console.log(`Retrying in 1 second...`);
          setTimeout(() => tryRequest(attemptsLeft - 1), 1000);
        } else {
          reject(err);
        }
      });
      
      // Set a timeout
      req.setTimeout(timeout, () => {
        console.log(`Request to ${url} timed out after ${timeout}ms`);
        req.destroy();
        
        if (attemptsLeft > 0) {
          console.log(`Retrying in 1 second...`);
          setTimeout(() => tryRequest(attemptsLeft - 1), 1000);
        } else {
          reject(new Error('Request timed out after multiple attempts'));
        }
      });
    };
    
    tryRequest(retries);
  });
}

/**
 * Check if the GitHub MCP server is running by verifying REST API capabilities
 */
async function checkGitHubMcp() {
  try {
    // Check if the REST API is accessible (which is what MCP needs)
    const restApiUrl = "http://localhost:7867/capabilities";
    console.log(`Checking GitHub REST API at ${restApiUrl}`);
    const response = await makeRequest(restApiUrl);
    
    if (response.statusCode === 200) {
      console.log(`GitHub REST API is running on port 7867`);
      return true;
    } else {
      console.log(`GitHub REST API returned status: ${response.statusCode}`);
      return false;
    }
  } catch (err) {
    console.log(`Error checking GitHub MCP/REST: ${err.message}`);
    return false;
  }
}

/**
 * Check if the Coverage MCP server is running by verifying REST API capabilities
 */
async function checkCoverageMcp() {
  try {
    // Check if the REST API is accessible (which is what MCP needs)
    const restApiUrl = "http://localhost:7868/capabilities";
    console.log(`Checking Coverage REST API at ${restApiUrl}`);
    const response = await makeRequest(restApiUrl);
    
    if (response.statusCode === 200) {
      console.log(`Coverage REST API is running on port 7868`);
      return true;
    } else {
      console.log(`Coverage REST API returned status: ${response.statusCode}`);
      return false;
    }
  } catch (err) {
    console.log(`Error checking Coverage MCP/REST: ${err.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.blue}Checking if MCP servers are running in Docker...${colors.reset}`);
  
  // Wait for servers to be available (they might have just started)
  console.log(`${colors.yellow}Waiting for servers to be fully available...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const githubMcpRunning = await checkGitHubMcp();
  const coverageMcpRunning = await checkCoverageMcp();
  
  console.log(`GitHub MCP: ${githubMcpRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
  console.log(`Coverage MCP: ${coverageMcpRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
  
  if (githubMcpRunning && coverageMcpRunning) {
    console.log(`${colors.green}All MCP servers are running in Docker${colors.reset}`);
    // Create a file to indicate MCP is running in Docker
    require('fs').writeFileSync('/app/mcp-servers/mcp-docker-running', '1');
    process.exit(0);
  } else {
    console.log(`${colors.red}Some MCP servers are not running in Docker${colors.reset}`);
    process.exit(1);
  }
}

// Run the main function
main().catch((err) => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});