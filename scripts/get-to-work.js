#!/usr/bin/env node

/**
 * Get-to-work script - Main entry point for developers
 * 
 * This script provides a platform-independent way to start working on the DocGen project.
 * It detects the current platform and runs the appropriate commands.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the script file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Platform detection
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';
const isUnix = !isWindows;

console.log(`Platform detected: ${os.platform()}`);

// Main function
async function main() {
  console.log('Starting DocGen workflow...');

  if (isUnix) {
    // On macOS or Linux, run the shell script
    console.log('Running Unix workflow script...');
    const unixScript = path.join(__dirname, 'unix', 'get-to-work.sh');
    
    if (fs.existsSync(unixScript)) {
      // Make executable
      try {
        fs.chmodSync(unixScript, '755');
      } catch (error) {
        console.warn(`Warning: Could not make script executable: ${error.message}`);
      }
      
      const result = spawn('bash', [unixScript], { 
        stdio: 'inherit',
        shell: true
      });
      
      result.on('close', (code) => {
        process.exit(code || 0);
      });
    } else {
      console.error(`Error: Unix script not found at ${unixScript}`);
      process.exit(1);
    }
  } else {
    // On Windows, run the PowerShell script
    console.log('Running Windows workflow script...');
    const windowsScript = path.join(__dirname, 'windows', 'get-to-work.ps1');
    
    if (fs.existsSync(windowsScript)) {
      const result = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', windowsScript], { 
        stdio: 'inherit',
        shell: true
      });
      
      result.on('close', (code) => {
        process.exit(code || 0);
      });
    } else {
      console.error(`Error: Windows script not found at ${windowsScript}`);
      // Fallback to Docker
      console.log('Attempting to run via Docker...');
      // Implementation would go here
      process.exit(1);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});