#!/usr/bin/env node
/**
 * Windsurf Configuration Script
 * 
 * This utility configures Windsurf IDE for integration with DocGen's MCP servers.
 * It detects the appropriate paths and generates the necessary Windsurf config.
 */

const path = require('path');
const os = require('os');
const { createAIProvider } = require('./factory');

/**
 * Configure Windsurf with DocGen MCP servers
 */
async function configureWindsurf() {
  try {
    console.log('DocGen Windsurf Configuration Utility');
    console.log('====================================\n');
    
    // Get the AI provider (should be Windsurf on Windows)
    const provider = createAIProvider({ forceWindsurf: true });
    
    // Check if provider is Windsurf
    if (provider.getInfo().name !== 'Windsurf') {
      console.error('Error: This utility is for Windsurf IDE only');
      console.log('Provider detected:', provider.getInfo().name);
      process.exit(1);
    }
    
    // Check if Windsurf is available
    if (!(await provider.isAvailable())) {
      console.error('Error: Windsurf is not available on this system');
      console.log('\nPlease install Windsurf from https://www.codeium.com/windsurf');
      console.log('After installing, run this utility again');
      process.exit(1);
    }
    
    console.log(`Detected Windsurf at: ${provider.getInfo().executablePath}`);
    
    // Initialize the provider
    await provider.initialize();
    
    // Determine the MCP server paths
    const projectRoot = path.resolve(__dirname, '../..');
    
    const serverPaths = {
      github: path.join(projectRoot, 'mcp-servers', 'github-issues', 'server.cjs'),
      coverage: path.join(projectRoot, 'mcp-servers', 'coverage-analysis', 'server.cjs')
    };
    
    // Set environment variables
    const serverEnv = {
      MCP_SERVER_HOST: '127.0.0.1',
      NODE_ENV: 'production'
    };
    
    console.log('\nConfiguring Windsurf MCP integration with the following settings:');
    console.log(`- GitHub MCP Server: ${serverPaths.github}`);
    console.log(`- Coverage MCP Server: ${serverPaths.coverage}`);
    
    // Configure MCP for Windsurf
    const success = await provider.configureMCP({ 
      serverPaths, 
      serverEnv 
    });
    
    if (success) {
      console.log('\nWindsurf MCP integration configured successfully!');
      console.log(`Configuration saved to: ${provider.getInfo().configPath}`);
      
      console.log('\nInstructions:');
      console.log('1. Start the DocGen MCP servers with: npm run mcp:start');
      console.log('2. Open Windsurf IDE');
      console.log('3. Open the Cascade panel (Ctrl+L)');
      console.log('4. Cascade will now have access to DocGen MCP tools');
      console.log('\nExample commands to try in Cascade:');
      console.log('@github getIssues');
      console.log('@coverage getCoverageMetrics');
      
      process.exit(0);
    } else {
      console.error('Failed to configure Windsurf MCP integration');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error configuring Windsurf:', error.message);
    process.exit(1);
  }
}

// Run the script if invoked directly
if (require.main === module) {
  configureWindsurf();
}

module.exports = configureWindsurf;