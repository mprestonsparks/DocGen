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
const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:7867';
const COVERAGE_MCP_URL = process.env.COVERAGE_MCP_URL || 'http://localhost:7868';

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
    
    try {
      const githubResponse = await axios.get(`${GITHUB_MCP_URL}/capabilities`, { timeout: 2000 });
      githubRunning = githubResponse.status === 200;
    } catch (e) {
      githubRunning = false;
    }
    
    try {
      const coverageResponse = await axios.get(`${COVERAGE_MCP_URL}/capabilities`, { timeout: 2000 });
      coverageRunning = coverageResponse.status === 200;
    } catch (e) {
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
    
    // Start servers using the script
    const scriptPath = path.join(PROJECT_ROOT, 'mcp-servers', 'start-mcp-servers.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${colors.red}MCP server script not found: ${scriptPath}${colors.reset}`);
      return { success: false, error: 'MCP server script not found' };
    }
    
    // Create log directory if it doesn't exist
    const logDir = path.join(PROJECT_ROOT, 'logs', 'mcp-debug');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logPath = path.join(logDir, 'startup.log');
    const logStream = fs.createWriteStream(logPath);
    
    // Start the servers
    const serverProcess = spawn(scriptPath, [], { 
      stdio: ['ignore', logStream, logStream],
      shell: true,
      detached: true
    });
    
    // Don't wait for the process to exit
    serverProcess.unref();
    
    console.log(`${colors.yellow}MCP servers starting in background${colors.reset}`);
    console.log(`${colors.cyan}Check logs at: ${logPath}${colors.reset}`);
    
    // Wait for servers to start (up to 10 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    
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
    
    // Stop servers using the script
    const scriptPath = path.join(PROJECT_ROOT, 'mcp-servers', 'start-mcp-servers.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${colors.red}MCP server script not found: ${scriptPath}${colors.reset}`);
      return { success: false, error: 'MCP server script not found' };
    }
    
    // Execute the stop command
    execSync(`${scriptPath} stop`, { stdio: 'inherit' });
    
    console.log(`${colors.green}MCP servers stopped successfully${colors.reset}`);
    return { success: true };
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
