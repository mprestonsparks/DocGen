#!/usr/bin/env node
/**
 * Windsurf Configuration Script
 * 
 * This script configures Windsurf IDE to work with DocGen MCP servers.
 * It detects Windsurf and sets up the appropriate MCP configuration.
 */
const createAIProvider = require('./factory');
const path = require('path');

/**
 * Configure Windsurf to use DocGen MCP servers
 */
async function configureWindsurf() {
  try {
    console.log('\nConfiguring Windsurf IDE integration for DocGen...');
    
    // Get the AI provider (should be Windsurf on Windows)
    const provider = createAIProvider();
    
    // Check if Windsurf is available
    if (!(await provider.isAvailable())) {
      console.error('\nError: Windsurf is not available on this system');
      console.log('Please install Windsurf from https://www.codeium.com/windsurf');
      process.exit(1);
    }
    
    // Configure MCP for Windsurf
    const projectRoot = path.resolve(__dirname, '..', '..');
    
    const serverPaths = {
      github: path.join(projectRoot, 'mcp-servers', 'github-issues', 'server.js'),
      coverage: path.join(projectRoot, 'mcp-servers', 'coverage-analysis', 'server.js')
    };
    
    // First check if the server files exist
    const fs = require('fs');
    if (!fs.existsSync(serverPaths.github)) {
      // Try alternative extensions (.cjs, .ts)
      if (fs.existsSync(serverPaths.github.replace('.js', '.cjs'))) {
        serverPaths.github = serverPaths.github.replace('.js', '.cjs');
      } else if (fs.existsSync(serverPaths.github.replace('.js', '.ts'))) {
        serverPaths.github = serverPaths.github.replace('.js', '.ts');
      } else {
        console.error(`\nError: GitHub MCP server not found at: ${serverPaths.github}`);
        console.log('Please ensure the DocGen project is properly installed');
        process.exit(1);
      }
    }
    
    if (!fs.existsSync(serverPaths.coverage)) {
      // Try alternative extensions (.cjs, .ts)
      if (fs.existsSync(serverPaths.coverage.replace('.js', '.cjs'))) {
        serverPaths.coverage = serverPaths.coverage.replace('.js', '.cjs');
      } else if (fs.existsSync(serverPaths.coverage.replace('.js', '.ts'))) {
        serverPaths.coverage = serverPaths.coverage.replace('.js', '.ts');
      } else {
        console.error(`\nError: Coverage MCP server not found at: ${serverPaths.coverage}`);
        console.log('Please ensure the DocGen project is properly installed');
        process.exit(1);
      }
    }
    
    // Configure Windsurf MCP
    const success = await provider.configureMCP({ serverPaths });
    
    if (success) {
      console.log('\nWindsurf MCP integration configured successfully');
      console.log(`Configuration saved to: ${provider.getInfo().configPath}`);
      
      console.log('\nInstructions:');
      console.log('1. Open Windsurf IDE');
      console.log('2. Open the Cascade panel (Ctrl+L)');
      console.log('3. Cascade will now have access to DocGen MCP tools');
      process.exit(0);
    } else {
      console.error('\nFailed to configure Windsurf IDE integration');
      console.log('Please make sure Windsurf is installed and you have write permissions to the configuration directory');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error configuring Windsurf:', error.message);
    process.exit(1);
  }
}

// Run the configuration if this script is executed directly
if (require.main === module) {
  configureWindsurf();
}

module.exports = configureWindsurf;