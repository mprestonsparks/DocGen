#!/usr/bin/env node
/**
 * Claude Code MCP Test Script
 * 
 * This script can be used directly by Claude Code to test the MCP connection.
 * It creates a simple JSON-RPC request and sends it to the MCP adapter,
 * verifying that the connection works correctly.
 * 
 * Usage in Claude Code:
 * 1. Run this script without arguments to test both MCP servers
 * 2. Run with 'github' argument to test only the GitHub MCP
 * 3. Run with 'coverage' argument to test only the Coverage MCP
 */

// This is intentionally a minimalistic script without external dependencies
// so Claude Code can run it directly without issues.
const http = require('http');

// Define the MCP server ports
const GH_PORT = 7866;
const COV_PORT = 7865;

// Colors for terminal output
const RED = '\u001b[31m';
const GREEN = '\u001b[32m';
const YELLOW = '\u001b[33m';
const CYAN = '\u001b[36m';
const RESET = '\u001b[0m';

// Helper function to make a JSON-RPC request
async function makeRequest(port, method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });
    
    const options = {
      hostname: 'localhost',
      port,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
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
    
    req.write(data);
    req.end();
  });
}

// Test the GitHub MCP adapter
async function testGitHub() {
  console.log(`${CYAN}Testing GitHub MCP Adapter...${RESET}`);
  
  try {
    // Initialize request
    const initResult = await makeRequest(GH_PORT, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'claude-test',
        version: '1.0.0'
      }
    });
    
    if (initResult.result && initResult.result.serverInfo) {
      console.log(`${GREEN}✓ GitHub MCP initialize successful${RESET}`);
      console.log(`  Server: ${initResult.result.serverInfo.name} v${initResult.result.serverInfo.version}`);
      
      // Get available methods
      const methods = Object.keys(initResult.result.capabilities.methods)
        .filter(m => m.startsWith('github.'))
        .map(m => `    - ${m}`);
      
      console.log(`  Available methods: ${methods.length}`);
      
      // Test getIssues method
      console.log(`${CYAN}Testing github.getIssues method...${RESET}`);
      const issuesResult = await makeRequest(GH_PORT, 'github.getIssues', { 
        state: 'open',
        limit: 3 
      });
      
      if (issuesResult.result && issuesResult.result.issues) {
        console.log(`${GREEN}✓ github.getIssues successful${RESET}`);
        console.log(`  Retrieved ${issuesResult.result.issues.length} issues`);
        
        // Show a sample issue
        if (issuesResult.result.issues.length > 0) {
          const issue = issuesResult.result.issues[0];
          console.log(`  Sample issue: #${issue.number} - ${issue.title}`);
        }
      } else {
        console.log(`${RED}✗ github.getIssues failed${RESET}`);
        console.log(`  Error: ${JSON.stringify(issuesResult.error || 'Unknown error')}`);
      }
      
      return true;
    } else {
      console.log(`${RED}✗ GitHub MCP initialize failed${RESET}`);
      console.log(`  Error: ${JSON.stringify(initResult.error || 'Unknown error')}`);
      return false;
    }
  } catch (error) {
    console.log(`${RED}✗ GitHub MCP test failed${RESET}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

// Test the Coverage MCP adapter
async function testCoverage() {
  console.log(`${CYAN}Testing Coverage MCP Adapter...${RESET}`);
  
  try {
    // Initialize request
    const initResult = await makeRequest(COV_PORT, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'claude-test',
        version: '1.0.0'
      }
    });
    
    if (initResult.result && initResult.result.serverInfo) {
      console.log(`${GREEN}✓ Coverage MCP initialize successful${RESET}`);
      console.log(`  Server: ${initResult.result.serverInfo.name} v${initResult.result.serverInfo.version}`);
      
      // Get available methods
      const methods = Object.keys(initResult.result.capabilities.methods)
        .filter(m => m.startsWith('coverage.'))
        .map(m => `    - ${m}`);
      
      console.log(`  Available methods: ${methods.length}`);
      
      // Test getCoverageMetrics method
      console.log(`${CYAN}Testing coverage.getCoverageMetrics method...${RESET}`);
      const metricsResult = await makeRequest(COV_PORT, 'coverage.getCoverageMetrics', {});
      
      if (metricsResult.result && metricsResult.result.metrics) {
        console.log(`${GREEN}✓ coverage.getCoverageMetrics successful${RESET}`);
        const metrics = metricsResult.result.metrics;
        console.log(`  Statement coverage: ${metrics.statements.percentage}%`);
        console.log(`  Branch coverage: ${metrics.branches.percentage}%`);
        console.log(`  Function coverage: ${metrics.functions.percentage}%`);
        console.log(`  Line coverage: ${metrics.lines.percentage}%`);
      } else {
        console.log(`${RED}✗ coverage.getCoverageMetrics failed${RESET}`);
        console.log(`  Error: ${JSON.stringify(metricsResult.error || 'Unknown error')}`);
      }
      
      return true;
    } else {
      console.log(`${RED}✗ Coverage MCP initialize failed${RESET}`);
      console.log(`  Error: ${JSON.stringify(initResult.error || 'Unknown error')}`);
      return false;
    }
  } catch (error) {
    console.log(`${RED}✗ Coverage MCP test failed${RESET}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log(`${CYAN}=== Claude Code MCP Integration Test ====${RESET}`);
  console.log('Testing direct connection to MCP adapters...');
  console.log('');
  
  const args = process.argv.slice(2);
  const testGithubOnly = args.includes('github');
  const testCoverageOnly = args.includes('coverage');
  
  let githubResult = false;
  let coverageResult = false;
  
  if (!testCoverageOnly) {
    githubResult = await testGitHub();
    console.log('');
  }
  
  if (!testGithubOnly) {
    coverageResult = await testCoverage();
    console.log('');
  }
  
  // Summary
  console.log(`${CYAN}=== Test Results ====${RESET}`);
  
  if (testGithubOnly) {
    console.log(`GitHub MCP: ${githubResult ? GREEN + '✓ PASSED' : RED + '✗ FAILED'}${RESET}`);
  } else if (testCoverageOnly) {
    console.log(`Coverage MCP: ${coverageResult ? GREEN + '✓ PASSED' : RED + '✗ FAILED'}${RESET}`);
  } else {
    console.log(`GitHub MCP: ${githubResult ? GREEN + '✓ PASSED' : RED + '✗ FAILED'}${RESET}`);
    console.log(`Coverage MCP: ${coverageResult ? GREEN + '✓ PASSED' : RED + '✗ FAILED'}${RESET}`);
    console.log(`Overall: ${(githubResult && coverageResult) ? GREEN + '✓ PASSED' : RED + '✗ FAILED'}${RESET}`);
  }
  
  console.log('');
  console.log(`${YELLOW}=== Claude Code MCP Usage ====${RESET}`);
  console.log('You can now use these MCP commands in Claude Code:');
  console.log('');
  console.log('1. GitHub Issues:');
  console.log('   @github getIssues --labels "implementation-gap"');
  console.log('   @github getIssue --issueNumber 15');
  console.log('');
  console.log('2. Coverage Analysis:');
  console.log('   @coverage getCoverageMetrics');
  console.log('   @coverage getImplementationGaps --threshold 70');
  console.log('');
  
  // Exit with appropriate code
  if (testGithubOnly) {
    process.exit(githubResult ? 0 : 1);
  } else if (testCoverageOnly) {
    process.exit(coverageResult ? 0 : 1);
  } else {
    process.exit(githubResult && coverageResult ? 0 : 1);
  }
}

// Run the tests
main().catch(error => {
  console.error(`${RED}Unhandled error:${RESET}`, error);
  process.exit(1);
});