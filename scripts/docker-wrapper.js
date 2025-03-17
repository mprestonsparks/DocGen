#!/usr/bin/env node
/**
 * Docker Wrapper for Windows
 * 
 * This script provides a clean interface for running commands in Docker
 * with properly formatted output on Windows systems.
 * 
 * @deprecated This script is being replaced by docker-run.js which provides
 * better output formatting. Please use docker-run.js for new code.
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
const isWindows = os.platform() === 'win32';

// Process arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: No command specified');
  console.log('Usage: node docker-wrapper.js <command> [args...]');
  console.log('Note: This script is deprecated. Please use docker-run.js instead.');
  process.exit(1);
}

// The command to run in Docker
const command = args.join(' ');

// Run the command in Docker without TTY allocation to prevent freezing
function runInDocker(cmd) {
  console.log(`Running in Docker: ${cmd}`);
  console.log('Note: This script is deprecated. Please use docker-run.js for better output formatting.');
  
  // For Windows, we'll use the simplest approach that works reliably
  const result = spawnSync('docker', [
    'exec',
    'docker-docgen-1',
    'bash',
    '-c',
    cmd
  ], { 
    stdio: 'inherit',
    shell: isWindows, // Use shell on Windows to handle quotes properly
    windowsVerbatimArguments: false
  });
  
  return result.status || 0;
}

// Main execution
const exitCode = runInDocker(command);
process.exit(exitCode);
