#!/usr/bin/env node
/**
 * Docker Commands Utility
 * 
 * Provides simple commands for Docker operations:
 * - start: Start the Docker container
 * - stop: Stop the Docker container
 * - exec: Execute a command in the Docker container
 * - status: Check the status of the Docker container
 * - mcp: Start, stop, or check MCP servers in Docker
 */
import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Platform detection
const platform = {
  isWindows: os.platform() === 'win32',
  isMac: os.platform() === 'darwin',
  isLinux: os.platform() === 'linux',
  isUnix: os.platform() !== 'win32'
};

// Constants
const DOCKER_COMPOSE_FILE = path.join(__dirname, '..', '.docker', 'docker-compose.yml');
const DOCKER_SERVICE_NAME = 'docgen';

/**
 * Displays help information
 */
function showHelp(): void {
  console.log(`
Docker Commands Utility for DocGen

Usage:
  ts-node docker-commands.ts <command> [args...]

Commands:
  start       Start the Docker container
  stop        Stop the Docker container
  exec        Execute a command in the Docker container
  status      Check the status of the Docker container
  mcp         Manage MCP servers (start, stop, check)
  help        Show this help message

Examples:
  ts-node docker-commands.ts start
  ts-node docker-commands.ts exec bash scripts/unix/get-to-work.sh
  ts-node docker-commands.ts exec npm run interview
  ts-node docker-commands.ts mcp start
  `);
}

/**
 * Checks if the Docker container is running
 * @returns {boolean} - True if container is running
 */
function isContainerRunning(): boolean {
  try {
    const result = spawnSync(
      'docker-compose',
      ['-f', DOCKER_COMPOSE_FILE, 'ps', '-q', DOCKER_SERVICE_NAME],
      { encoding: 'utf8' }
    );
    return Boolean(result.stdout && result.stdout.trim().length > 0);
  } catch (error) {
    console.error('Error checking Docker container status:', (error as Error).message);
    return false;
  }
}

/**
 * Starts the Docker container
 */
function startContainer(): void {
  console.log('Starting Docker container...');
  
  // Check if .env file exists, if not copy from example
  const envFile = path.join(__dirname, '..', '.env');
  const envExampleFile = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envFile) && fs.existsSync(envExampleFile)) {
    console.log('Creating .env file from .env.example...');
    fs.copyFileSync(envExampleFile, envFile);
    console.log('Created .env file. Please edit it to add your GitHub token and other settings.');
  }
  
  // Start the container
  const result = spawnSync(
    'docker-compose',
    ['-f', DOCKER_COMPOSE_FILE, 'up', '-d'],
    { stdio: 'inherit' }
  );
  
  if (result.status !== 0) {
    console.error('Failed to start Docker container');
    process.exit(1);
  }
  
  console.log('Docker container started successfully');
}

/**
 * Stops the Docker container
 */
function stopContainer(): void {
  console.log('Stopping Docker container...');
  
  const result = spawnSync(
    'docker-compose',
    ['-f', DOCKER_COMPOSE_FILE, 'down'],
    { stdio: 'inherit' }
  );
  
  if (result.status !== 0) {
    console.error('Failed to stop Docker container');
    process.exit(1);
  }
  
  console.log('Docker container stopped successfully');
}

/**
 * Checks the status of the Docker container
 */
function checkStatus(): void {
  console.log('Checking Docker container status...');
  
  const result = spawnSync(
    'docker-compose',
    ['-f', DOCKER_COMPOSE_FILE, 'ps'],
    { stdio: 'inherit' }
  );
  
  if (result.status !== 0) {
    console.error('Failed to check Docker container status');
    process.exit(1);
  }
}

/**
 * Executes a command in the Docker container
 * @param {string[]} args - Command and arguments to execute
 */
function execCommand(args: string[]): void {
  if (args.length === 0) {
    console.error('No command specified');
    showHelp();
    process.exit(1);
  }
  
  if (!isContainerRunning()) {
    console.log('Docker container is not running. Starting it now...');
    startContainer();
  }
  
  // Convert Windows paths to Unix paths if needed
  const processedArgs = args.map(arg => {
    if (platform.isWindows && arg.includes(':\\')) {
      // This is a Windows path, convert to Docker path
      return arg.replace(/\\/g, '/');
    }
    return arg;
  });
  
  // Join all arguments into a single command string
  const commandString = processedArgs.join(' ');
  
  // For PowerShell compatibility, we need to handle nested quotes differently
  // Create a temporary script file to execute in the container
  const tempScriptPath = path.join(os.tmpdir(), `docker-exec-${Date.now()}.sh`);
  fs.writeFileSync(tempScriptPath, commandString);
  
  console.log(`Running in Docker: ${commandString}`);
  
  // Copy the script to the container and execute it
  const copyResult = spawnSync(
    'docker',
    ['cp', tempScriptPath, `docker-docgen-1:/tmp/docker-exec.sh`],
    { stdio: 'inherit' }
  );
  
  if (copyResult.status !== 0) {
    console.error('Failed to copy script to container');
    fs.unlinkSync(tempScriptPath);
    process.exit(1);
  }
  
  // Execute the script in the container
  const result = spawnSync(
    'docker-compose',
    ['-f', DOCKER_COMPOSE_FILE, 'exec', DOCKER_SERVICE_NAME, 'bash', '-c', 'chmod +x /tmp/docker-exec.sh && /tmp/docker-exec.sh'],
    { stdio: 'inherit' }
  );
  
  // Clean up
  fs.unlinkSync(tempScriptPath);
  
  process.exit(result.status || 0);
}

/**
 * Manages MCP servers in Docker
 * @param {string[]} args - MCP command and arguments
 */
function manageMcpServers(args: string[]): void {
  if (args.length === 0) {
    console.error('MCP command required (start, stop, restart, check)');
    showHelp();
    process.exit(1);
  }
  
  if (!isContainerRunning()) {
    console.log('Docker container is not running. Starting it now...');
    startContainer();
  }
  
  const command = args[0];
  
  // Determine the appropriate script to run
  let scriptCommand = '';
  
  switch (command) {
    case 'start':
      scriptCommand = '/app/mcp-servers/start-mcp-adapters.sh';
      break;
    case 'stop':
      scriptCommand = '/app/mcp-servers/start-mcp-adapters.sh stop';
      break;
    case 'restart':
      scriptCommand = '/app/mcp-servers/start-mcp-adapters.sh restart';
      break;
    case 'check':
      scriptCommand = 'node /app/docgen.js check-servers';
      break;
    default:
      console.error(`Unknown MCP command: ${command}`);
      showHelp();
      process.exit(1);
  }
  
  console.log(`Running MCP command in Docker: ${command}`);
  
  // Execute the command in the container
  const result = spawnSync(
    'docker-compose',
    ['-f', DOCKER_COMPOSE_FILE, 'exec', DOCKER_SERVICE_NAME, 'bash', '-c', scriptCommand],
    { stdio: 'inherit' }
  );
  
  process.exit(result.status || 0);
}

/**
 * Main execution
 */
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    process.exit(0);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  switch (command) {
    case 'start':
      startContainer();
      break;
    case 'stop':
      stopContainer();
      break;
    case 'exec':
      execCommand(commandArgs);
      break;
    case 'status':
      checkStatus();
      break;
    case 'mcp':
      manageMcpServers(commandArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Execute if this script is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  startContainer,
  stopContainer,
  execCommand,
  checkStatus,
  isContainerRunning,
  manageMcpServers
};