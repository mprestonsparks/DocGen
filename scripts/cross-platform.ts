#!/usr/bin/env node
/**
 * Cross-Platform Script Runner
 * 
 * This script detects the platform and runs the appropriate script:
 * - On Windows: Runs the .ps1 version if available, otherwise uses Docker
 * - On Unix: Runs the .sh version
 * 
 * Usage: ts-node cross-platform.ts <script-base-name> [args...]
 * Example: ts-node cross-platform.ts get-to-work --help
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

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Cross-Platform Script Runner for DocGen

Usage:
  node cross-platform.js <script-base-name> [args...]

Description:
  This utility automatically runs the appropriate script based on your platform:
  - On Windows: Runs the .ps1 version if available, otherwise uses Docker to run the .sh version
  - On Unix: Runs the .sh version

Examples:
  node cross-platform.js get-to-work
  node cross-platform.js mcp-servers/start-mcp-servers
  node cross-platform.js scripts/run-github-workflow

Available Scripts:
  get-to-work                      - Start the interactive workflow
  mcp-servers/start-mcp-servers    - Start the MCP servers
  scripts/run-github-workflow      - Run the GitHub workflow
  scripts/run-monitoring           - Run the monitoring script
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
      ['-f', path.join(projectRoot, '.docker', 'docker-compose.yml'), 'ps', '-q', 'docgen'],
      { encoding: 'utf8' }
    );
    return Boolean(result.stdout && result.stdout.trim().length > 0);
  } catch (error) {
    console.error('Error checking Docker container status:', (error as Error).message);
    return false;
  }
}

/**
 * Starts the Docker container if not already running
 */
function ensureContainerRunning(): void {
  if (!isContainerRunning()) {
    console.log('Starting Docker container...');
    
    // Check if .env file exists, if not copy from example
    const envFile = path.join(projectRoot, '.env');
    const envExampleFile = path.join(projectRoot, '.env.example');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envExampleFile)) {
      console.log('Creating .env file from .env.example...');
      fs.copyFileSync(envExampleFile, envFile);
      console.log('Created .env file. Please edit it to add your GitHub token and other settings.');
    }
    
    // Start the container
    const startResult = spawnSync(
      'docker-compose',
      ['-f', path.join(projectRoot, '.docker', 'docker-compose.yml'), 'up', '-d'],
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
function runInDocker(args: string[]): void {
  ensureContainerRunning();
  
  // Convert Windows paths to Unix paths if needed
  const processedArgs = args.map(arg => {
    if (platform.isWindows && arg.includes(':\\')) {
      // This is a Windows path, convert to Docker path
      return arg.replace(/\\/g, '/');
    }
    return arg;
  });
  
  console.log(`Running in Docker: ${processedArgs.join(' ')}`);
  
  const result = spawnSync(
    'docker-compose',
    ['-f', path.join(projectRoot, '.docker', 'docker-compose.yml'), 'exec', 'docgen', ...processedArgs],
    { stdio: 'inherit' }
  );
  
  process.exit(result.status || 0);
}

/**
 * Runs a script with the appropriate extension for the current platform
 * @param {string} scriptBasePath - Base path of the script without extension
 * @param {string[]} args - Arguments to pass to the script
 */
function runPlatformScript(scriptBasePath: string, args: string[]): void {
  // Special handling for docgen and MCP commands
  if (scriptBasePath === 'docgen') {
    if (platform.isWindows) {
      // On Windows, use the PowerShell wrapper
      console.log(`Running docgen command using PowerShell wrapper`);
      const ps1Script = path.join(projectRoot, 'scripts', 'windows', 'get-to-work.ps1');
      const result = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', ps1Script, ...args], { 
        stdio: 'inherit',
        shell: true
      });
      process.exit(result.status || 0);
    } else {
      // On Unix, use the docgen.ts script directly
      console.log(`Running docgen command directly`);
      const docgenScript = path.join(projectRoot, 'docgen.ts');
      
      // Make sure the script is executable
      try {
        fs.chmodSync(docgenScript, '755');
      } catch (error) {
        console.warn(`Warning: Could not make script executable: ${(error as Error).message}`);
      }
      
      const result = spawnSync('ts-node', [docgenScript, ...args], { 
        stdio: 'inherit',
        shell: true
      });
      process.exit(result.status || 0);
    }
    return;
  } else if (scriptBasePath === 'mcp' || scriptBasePath === 'mcp-servers') {
    // Use the docker-commands.ts script for MCP management
    const dockerCommandsScript = path.join(projectRoot, 'scripts', 'docker-commands.ts');
    console.log(`Managing MCP servers using Docker commands script`);

    // Check command - if none provided, default to 'check'
    const mcpCommand = args.length > 0 ? args[0] : 'check';
    const mcpArgs = args.length > 0 ? args.slice(1) : [];

    const result = spawnSync('ts-node', [dockerCommandsScript, 'mcp', mcpCommand, ...mcpArgs], {
      stdio: 'inherit',
      shell: true
    });
    process.exit(result.status || 0);
    return;
  }

  // Normalize the script path (remove any extension if provided)
  const normalizedScriptBase = scriptBasePath.replace(/\.(sh|ps1)$/, '');
  
  // Get the full path to the script
  const scriptBaseName = path.basename(normalizedScriptBase);
  const scriptDir = path.dirname(path.resolve(projectRoot, normalizedScriptBase));
  
  // Check for platform-specific scripts in both original and reorganized locations
  const shScript = path.join(scriptDir, `${scriptBaseName}.sh`);
  const ps1Script = path.join(scriptDir, `${scriptBaseName}.ps1`);
  
  // Check for reorganized scripts in platform-specific directories
  const unixScript = path.join(projectRoot, 'scripts', 'unix', `${scriptBaseName}.sh`);
  const windowsScript = path.join(projectRoot, 'scripts', 'windows', `${scriptBaseName}.ps1`);
  
  console.log(`Running ${scriptBaseName} for platform: ${platform.isWindows ? 'Windows' : 'Unix'}`);
  
  if (platform.isWindows) {
    // On Windows, try PowerShell script in the reorganized location first
    if (fs.existsSync(windowsScript)) {
      console.log(`Using PowerShell script from reorganized location: ${windowsScript}`);
      const result = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', windowsScript, ...args], { 
        stdio: 'inherit',
        shell: true
      });
      process.exit(result.status || 0);
    }
    // Then try the original location
    else if (fs.existsSync(ps1Script)) {
      console.log(`Using PowerShell script from original location: ${ps1Script}`);
      const result = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', ps1Script, ...args], { 
        stdio: 'inherit',
        shell: true
      });
      process.exit(result.status || 0);
    } 
    // Check for Unix script in reorganized location
    else if (fs.existsSync(unixScript)) {
      console.log(`No PowerShell script found. Using Docker to run Unix script from reorganized location: ${unixScript}`);
      runInDocker(['bash', unixScript, ...args]);
    }
    // Check for Unix script in original location
    else if (fs.existsSync(shScript)) {
      console.log(`No PowerShell script found. Using Docker to run Unix script from original location: ${shScript}`);
      runInDocker(['bash', shScript, ...args]);
    } else {
      console.error(`Error: No script found at ${shScript}, ${ps1Script}, ${unixScript}, or ${windowsScript}`);
      process.exit(1);
    }
  } else {
    // On Unix, try bash script in the reorganized location first
    if (fs.existsSync(unixScript)) {
      console.log(`Using bash script from reorganized location: ${unixScript}`);
      
      // Make sure the script is executable
      try {
        fs.chmodSync(unixScript, '755');
      } catch (error) {
        console.warn(`Warning: Could not make script executable: ${(error as Error).message}`);
      }
      
      const result = spawnSync('bash', [unixScript, ...args], { 
        stdio: 'inherit',
        shell: true
      });
      process.exit(result.status || 0);
    }
    // Then try the original location
    else if (fs.existsSync(shScript)) {
      console.log(`Using bash script from original location: ${shScript}`);
      
      // Make sure the script is executable
      try {
        fs.chmodSync(shScript, '755');
      } catch (error) {
        console.warn(`Warning: Could not make script executable: ${(error as Error).message}`);
      }
      
      const result = spawnSync('bash', [shScript, ...args], { 
        stdio: 'inherit',
        shell: true
      });
      process.exit(result.status || 0);
    } else {
      console.error(`Error: No script found at ${shScript} or ${unixScript}`);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }
  
  const scriptBasePath = args[0];
  const scriptArgs = args.slice(1);
  
  runPlatformScript(scriptBasePath, scriptArgs);
}

// Execute if this script is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  runPlatformScript,
  runInDocker,
  ensureContainerRunning,
  isContainerRunning
};