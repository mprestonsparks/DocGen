/**
 * MCP Server Manager
 * 
 * Core module for managing MCP servers, including:
 * - Checking if servers are running
 * - Starting servers
 * - Stopping servers
 * - Getting server status
 * 
 * This module is platform-agnostic and can be used by any developer
 * regardless of whether they're using Claude Code.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());

// Docker environment detection with improved logging
const isInDocker = fs.existsSync('/.dockerenv') || process.env.MCP_IN_DOCKER === '1';
const hasMcpDockerFlag = fs.existsSync('/app/mcp-servers/mcp-docker-running') || fs.existsSync(path.join(PROJECT_ROOT, '.mcp-in-docker'));

// Debug information
console.log(`MCP Server Manager - Environment Detection:`);
console.log(`- isInDocker: ${isInDocker}`);
console.log(`- hasMcpDockerFlag: ${hasMcpDockerFlag}`);
console.log(`- PROJECT_ROOT: ${PROJECT_ROOT}`);
console.log(`- MCP_IN_DOCKER env var: ${process.env.MCP_IN_DOCKER || 'not set'}`);

// Determine the correct host to use based on environment
let targetHost = 'localhost';

// If we're running outside Docker and MCP is in Docker, use Docker host
if (!isInDocker && hasMcpDockerFlag) {
  targetHost = process.platform === 'win32' ? 'host.docker.internal' : 'host.docker.internal';
  console.log('Using Docker host for MCP servers');
} else if (isInDocker) {
  // If we're in Docker, always use localhost
  targetHost = 'localhost';
  console.log('Running in Docker, using localhost for MCP servers');
} else {
  // Standard local development
  targetHost = 'localhost';
  console.log('Standard environment, using localhost for MCP servers');
}

// Set URLs with proper host
const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || `http://${targetHost}:7866`;
const COVERAGE_MCP_URL = process.env.COVERAGE_MCP_URL || `http://${targetHost}:7865`;

console.log(`Using GitHub MCP URL: ${GITHUB_MCP_URL}`);
console.log(`Using Coverage MCP URL: ${COVERAGE_MCP_URL}`);

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
 * Check if MCP servers are running
 */
async function checkMcpServers() {
  try {
    console.log(`${colors.blue}Checking if MCP servers are running...${colors.reset}`);
    
    let githubRunning = false;
    let coverageRunning = false;
    
    // In Docker, we need to check the REST API servers directly
    const GITHUB_REST_URL = `http://${isInDocker ? 'localhost' : DOCKER_HOST}:7867/capabilities`;
    const COVERAGE_REST_URL = `http://${isInDocker ? 'localhost' : DOCKER_HOST}:7868/capabilities`;
    
    console.log(`Checking GitHub REST API at ${GITHUB_REST_URL}`);
    console.log(`Checking Coverage REST API at ${COVERAGE_REST_URL}`);
    
    try {
      const githubResponse = await axios.get(GITHUB_REST_URL, { timeout: 2000 });
      githubRunning = githubResponse.status === 200;
      console.log(`GitHub REST API check result: ${githubResponse.status}`);
    } catch (e) {
      console.log(`GitHub REST API check error: ${e.message}`);
      githubRunning = false;
    }
    
    try {
      const coverageResponse = await axios.get(COVERAGE_REST_URL, { timeout: 2000 });
      coverageRunning = coverageResponse.status === 200;
      console.log(`Coverage REST API check result: ${coverageResponse.status}`);
    } catch (e) {
      console.log(`Coverage REST API check error: ${e.message}`);
      coverageRunning = false;
    }
    
    console.log(`GitHub MCP: ${githubRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
    console.log(`Coverage MCP: ${coverageRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
    
    return { githubRunning, coverageRunning };
  } catch (error) {
    console.error(`${colors.red}Error checking MCP servers: ${error.message}${colors.reset}`);
    return { githubRunning: false, coverageRunning: false, error: error.message };
  }
}

/**
 * Start MCP servers
 */
async function startMcpServers() {
  try {
    console.log(`${colors.blue}Starting MCP servers...${colors.reset}`);
    
    // Check if servers are already running
    const serverStatus = await checkMcpServers();
    if (serverStatus.githubRunning && serverStatus.coverageRunning) {
      console.log(`${colors.green}MCP servers are already running${colors.reset}`);
      return { success: true, alreadyRunning: true };
    }
    
    // Determine if we're in Docker
    const isInDocker = fs.existsSync('/.dockerenv');
    
    // Start servers using the appropriate script
    let scriptPath;
    if (isInDocker) {
      scriptPath = path.join('/app', 'mcp-servers', 'docker-mcp-adapters.sh');
    } else {
      scriptPath = path.join(PROJECT_ROOT, 'mcp-servers', 'start-mcp-adapters.sh');
    }
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${colors.red}MCP server script not found: ${scriptPath}${colors.reset}`);
      return { success: false, error: 'MCP server script not found' };
    }
    
    // Create log directory if it doesn't exist
    const logDir = path.join(isInDocker ? '/app' : PROJECT_ROOT, 'logs', 'mcp-debug');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logPath = path.join(logDir, 'startup.log');
    
    // Execute the script directly
    console.log(`${colors.yellow}Executing MCP server script: ${scriptPath}${colors.reset}`);
    try {
      execSync(`${scriptPath}`, { stdio: 'inherit' });
      console.log(`${colors.green}MCP servers script executed successfully${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error executing MCP servers script: ${error.message}${colors.reset}`);
      return { success: false, error: error.message };
    }
    
    // Wait for servers to start (up to 5 seconds)
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const status = await checkMcpServers();
      if (status.githubRunning && status.coverageRunning) {
        console.log(`${colors.green}MCP servers started successfully${colors.reset}`);
        return { success: true };
      }
      
      console.log(`${colors.yellow}Waiting for MCP servers to start (${attempts}/${maxAttempts})...${colors.reset}`);
    }
    
    console.log(`${colors.red}Timed out waiting for MCP servers to start${colors.reset}`);
    return { success: false, error: 'Timed out waiting for MCP servers to start' };
  } catch (error) {
    console.error(`${colors.red}Error starting MCP servers: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Stop MCP servers
 */
async function stopMcpServers() {
  try {
    console.log(`${colors.blue}Stopping MCP servers...${colors.reset}`);
    
    // Check if servers are running
    const serverStatus = await checkMcpServers();
    if (!serverStatus.githubRunning && !serverStatus.coverageRunning) {
      console.log(`${colors.yellow}MCP servers are not running${colors.reset}`);
      return { success: true, notRunning: true };
    }
    
    // Determine if we're in Docker
    const isInDocker = fs.existsSync('/.dockerenv');
    
    // Stop servers using the appropriate script
    let scriptPath;
    if (isInDocker) {
      scriptPath = path.join('/app', 'mcp-servers', 'docker-mcp-adapters.sh');
    } else {
      scriptPath = path.join(PROJECT_ROOT, 'mcp-servers', 'start-mcp-adapters.sh');
    }
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${colors.red}MCP server script not found: ${scriptPath}${colors.reset}`);
      return { success: false, error: 'MCP server script not found' };
    }
    
    // Execute the stop command
    console.log(`${colors.yellow}Executing MCP server stop command: ${scriptPath} stop${colors.reset}`);
    try {
      execSync(`${scriptPath} stop`, { stdio: 'inherit' });
      console.log(`${colors.green}MCP servers stopped successfully${colors.reset}`);
      return { success: true };
    } catch (error) {
      console.error(`${colors.red}Error stopping MCP servers: ${error.message}${colors.reset}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error(`${colors.red}Error stopping MCP servers: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get MCP server capabilities
 */
async function getMcpCapabilities() {
  try {
    console.log(`${colors.blue}Getting MCP server capabilities...${colors.reset}`);
    
    // Check if servers are running
    const serverStatus = await checkMcpServers();
    if (!serverStatus.githubRunning && !serverStatus.coverageRunning) {
      console.log(`${colors.yellow}MCP servers are not running${colors.reset}`);
      return { success: false, error: 'MCP servers are not running' };
    }
    
    const capabilities = {};
    
    // Get GitHub MCP capabilities
    if (serverStatus.githubRunning) {
      try {
        const response = await axios.get(`${GITHUB_MCP_URL}/capabilities`);
        capabilities.github = response.data;
      } catch (error) {
        console.error(`${colors.red}Error getting GitHub MCP capabilities: ${error.message}${colors.reset}`);
      }
    }
    
    // Get Coverage MCP capabilities
    if (serverStatus.coverageRunning) {
      try {
        const response = await axios.get(`${COVERAGE_MCP_URL}/capabilities`);
        capabilities.coverage = response.data;
      } catch (error) {
        console.error(`${colors.red}Error getting Coverage MCP capabilities: ${error.message}${colors.reset}`);
      }
    }
    
    return { success: true, capabilities };
  } catch (error) {
    console.error(`${colors.red}Error getting MCP capabilities: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  checkMcpServers,
  startMcpServers,
  stopMcpServers,
  getMcpCapabilities,
  colors
};