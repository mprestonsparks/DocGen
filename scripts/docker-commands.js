#!/usr/bin/env node
/**
 * Docker Commands Utility
 * 
 * Provides simple commands for Docker operations:
 * - start: Start the Docker container
 * - stop: Stop the Docker container
 * - exec: Execute a command in the Docker container
 * - status: Check the status of the Docker container
 */
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
function showHelp() {
  console.log(`
Docker Commands Utility for DocGen

Usage:
  node docker-commands.js <command> [args...]

Commands:
  start       Start the Docker container
  stop        Stop the Docker container
  exec        Execute a command in the Docker container
  status      Check the status of the Docker container
  help        Show this help message

Examples:
  node docker-commands.js start
  node docker-commands.js exec bash scripts/unix/get-to-work.sh
  node docker-commands.js exec npm run interview
  `);
}

/**
 * Checks if the Docker container is running
 * @returns {boolean} - True if container is running
 */
function isContainerRunning() {
  try {
    const result = spawnSync(
      'docker-compose',
      ['-f', DOCKER_COMPOSE_FILE, 'ps', '-q', DOCKER_SERVICE_NAME],
      { encoding: 'utf8' }
    );
    return result.stdout && result.stdout.trim().length > 0;
  } catch (error) {
    console.error('Error checking Docker container status:', error.message);
    return false;
  }
}

/**
 * Starts the Docker container
 */
function startContainer() {
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
function stopContainer() {
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
function checkStatus() {
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
function execCommand(args) {
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
 * Main execution
 */
function main() {
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
  isContainerRunning
};
