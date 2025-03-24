#!/usr/bin/env node
/**
 * Docker Runner Utility
 * 
 * Executes commands inside the DocGen Docker container
 * Handles container lifecycle (starting if not running)
 */
const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const platform = require('./platform');

// Constants
const DOCKER_COMPOSE_FILE = path.join(__dirname, '..', '..', '.docker', 'docker-compose.yml');
const DOCKER_SERVICE_NAME = 'docgen';

/**
 * Checks if the Docker container is running
 * @returns {boolean} - True if container is running
 */
function isContainerRunning() {
  try {
    const result = execSync(
      `docker-compose -f "${DOCKER_COMPOSE_FILE}" ps -q ${DOCKER_SERVICE_NAME}`,
      { encoding: 'utf8' }
    );
    return result.trim().length > 0;
  } catch (error) {
    console.error('Error checking Docker container status:', error.message);
    return false;
  }
}

/**
 * Starts the Docker container if not already running
 */
function ensureContainerRunning() {
  if (!isContainerRunning()) {
    console.log('Starting Docker container...');
    
    // Check if .env file exists, if not copy from example
    const envFile = path.join(__dirname, '..', '..', '.env');
    const envExampleFile = path.join(__dirname, '..', '..', '.env.example');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envExampleFile)) {
      console.log('Creating .env file from .env.example...');
      fs.copyFileSync(envExampleFile, envFile);
      console.log('Created .env file. Please edit it to add your GitHub token and other settings.');
    }
    
    // Start the container
    const startResult = spawnSync(
      'docker-compose',
      ['-f', DOCKER_COMPOSE_FILE, 'up', '-d'],
      { stdio: 'inherit' }
    );
    
    if (startResult.status !== 0) {
      console.error('Failed to start Docker container');
      process.exit(1);
    }
    
    console.log('Docker container started successfully');
  }
}

/**
 * Runs a command inside the Docker container
 * @param {string[]} args - Command and arguments to run
 */
function runInDocker(args) {
  ensureContainerRunning();
  
  // Convert Windows paths to Unix paths if needed
  const processedArgs = args.map(arg => {
    if (platform.isWindows && arg.includes(':\\')) {
      // This is a Windows path, convert to Docker path
      return platform.toDockerPath(arg);
    }
    return arg;
  });
  
  console.log(`Running in Docker: ${processedArgs.join(' ')}`);
  
  const result = spawnSync(
    'docker-compose',
    ['-f', DOCKER_COMPOSE_FILE, 'exec', DOCKER_SERVICE_NAME, ...processedArgs],
    { stdio: 'inherit' }
  );
  
  process.exit(result.status || 0);
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node docker-runner.js <command> [args...]');
    console.log('Example: node docker-runner.js bash scripts/unix/get-to-work.sh');
    process.exit(1);
  }
  
  runInDocker(args);
}

// Execute if this script is run directly
if (require.main === module) {
  main();
}

module.exports = {
  isContainerRunning,
  ensureContainerRunning,
  runInDocker
};
