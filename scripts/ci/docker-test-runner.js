#!/usr/bin/env node
/**
 * Docker Test Runner for CI/CD
 * 
 * This utility script helps run tests in Docker containers for CI/CD pipelines.
 * It provides a standardized way to build, run, and test the DocGen application
 * in a Docker environment, ensuring consistent results across different platforms.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  dockerfilePath: path.resolve(__dirname, '../../.docker/Dockerfile'),
  contextPath: path.resolve(__dirname, '../..'),
  imageName: 'docgen-ci',
  containerName: 'docgen-ci-test',
  testTimeout: 300000 // 5 minutes
};

/**
 * Run a command and return the result
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Object} - Process result
 */
function runCommand(command, args, options = {}) {
  console.log(`Running command: ${command} ${args.join(' ')}`);
  
  const defaultOptions = {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  };
  
  const result = spawnSync(command, args, { ...defaultOptions, ...options });
  
  if (result.error) {
    console.error(`Error running command: ${result.error.message}`);
    process.exit(1);
  }
  
  return result;
}

/**
 * Build the Docker image
 */
function buildImage() {
  console.log('Building Docker image...');
  
  // Check if Dockerfile exists
  if (!fs.existsSync(config.dockerfilePath)) {
    console.error(`Dockerfile not found at: ${config.dockerfilePath}`);
    process.exit(1);
  }
  
  const result = runCommand('docker', [
    'build',
    '-t', config.imageName,
    '-f', config.dockerfilePath,
    config.contextPath
  ]);
  
  if (result.status !== 0) {
    console.error('Failed to build Docker image');
    process.exit(result.status);
  }
  
  console.log('Docker image built successfully');
}

/**
 * Run tests in Docker container
 * @param {string} testCommand - Test command to run
 */
function runTests(testCommand) {
  console.log('Running tests in Docker container...');
  
  // Remove existing container if it exists
  runCommand('docker', ['rm', '-f', config.containerName], { stdio: 'ignore' });
  
  const result = runCommand('docker', [
    'run',
    '--name', config.containerName,
    '-v', `${config.contextPath}:/app`,
    config.imageName,
    'bash', '-c', testCommand
  ]);
  
  if (result.status !== 0) {
    console.error('Tests failed');
    process.exit(result.status);
  }
  
  console.log('Tests completed successfully');
}

/**
 * Verify MCP servers in Docker
 */
function verifyMcpServers() {
  console.log('Verifying MCP servers in Docker...');
  
  // Remove existing container if it exists
  runCommand('docker', ['rm', '-f', `${config.containerName}-mcp`], { stdio: 'ignore' });
  
  // Run MCP servers in Docker
  const result = runCommand('docker', [
    'run',
    '--name', `${config.containerName}-mcp`,
    '-d',
    config.imageName,
    'bash', '-c', 'cd /app && MCP_SERVER_HOST=0.0.0.0 node mcp-servers/github-issues/server.cjs & MCP_SERVER_HOST=0.0.0.0 node mcp-servers/coverage-analysis/server.cjs & sleep 5 && node mcp-servers/docker-check-mcp.cjs'
  ], { stdio: 'pipe' });
  
  if (result.status !== 0) {
    console.error('Failed to start MCP server container');
    process.exit(result.status);
  }
  
  // Wait for container to complete
  const waitResult = runCommand('docker', ['wait', `${config.containerName}-mcp`], { stdio: 'pipe' });
  const exitCode = parseInt(waitResult.stdout.toString().trim(), 10);
  
  // Show logs from the container
  runCommand('docker', ['logs', `${config.containerName}-mcp`]);
  
  if (exitCode !== 0) {
    console.error('MCP servers verification failed');
    process.exit(exitCode);
  }
  
  console.log('MCP servers verified successfully');
}

/**
 * Show command help
 */
function showHelp() {
  console.log(`
Docker Test Runner for CI/CD

Usage:
  node docker-test-runner.js <command>

Commands:
  build               Build the Docker image
  test [command]      Run tests in Docker container (default: npm test)
  verify-mcp          Verify MCP servers in Docker
  full                Run the full test suite (build, test, verify-mcp)
  help                Show this help message
  `);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'build':
      buildImage();
      break;
    
    case 'test':
      const testCommand = args[1] || 'cd /app && npm test';
      buildImage();
      runTests(testCommand);
      break;
    
    case 'verify-mcp':
      buildImage();
      verifyMcpServers();
      break;
    
    case 'full':
      buildImage();
      runTests('cd /app && npm test');
      verifyMcpServers();
      break;
    
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Run the main function
main();