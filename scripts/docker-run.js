#!/usr/bin/env node
/**
 * Docker Run Script
 * 
 * This script provides a clean interface for running commands in Docker
 * with properly formatted output on Windows systems.
 * 
 * Usage:
 *   node docker-run.js <command> [args...]
 * 
 * Example:
 *   node docker-run.js node docgen.js check-servers
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: No command specified');
  console.log('Usage: node docker-run.js <command> [args...]');
  process.exit(1);
}

// The command to run in Docker
const command = args.join(' ');

// Run the command in Docker with proper output formatting
function runInDocker(cmd) {
  console.log(`Running in Docker: ${cmd}`);
  
  // Use a two-step approach to ensure clean output
  // 1. First, write the output to a file in the container
  const tempOutputPath = '/tmp/docgen_output.txt';
  const dockerExecCmd = `docker exec docker-docgen-1 bash -c "cd /app && ${cmd} > ${tempOutputPath} 2>&1"`;
  
  const dockerExec = spawn('cmd.exe', ['/c', dockerExecCmd], { 
    stdio: 'inherit',
    shell: true 
  });
  
  return new Promise((resolve) => {
    dockerExec.on('close', (code) => {
      // 2. Then, read the file and display its contents
      const catCmd = `docker exec docker-docgen-1 cat ${tempOutputPath}`;
      const catProcess = spawn('cmd.exe', ['/c', catCmd], { 
        stdio: 'inherit',
        shell: true 
      });
      
      catProcess.on('close', (catCode) => {
        // Clean up the temporary file
        const rmCmd = `docker exec docker-docgen-1 rm -f ${tempOutputPath}`;
        const rmProcess = spawn('cmd.exe', ['/c', rmCmd], { 
          stdio: 'ignore',
          shell: true 
        });
        
        rmProcess.on('close', () => {
          resolve(code);
        });
      });
    });
  });
}

// Main execution
runInDocker(command).then(exitCode => {
  process.exit(exitCode);
});
