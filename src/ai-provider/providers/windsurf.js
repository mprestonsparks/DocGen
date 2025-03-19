/**
 * Windsurf IDE Provider Implementation
 * Integrates DocGen with Windsurf IDE on Windows
 */
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const AIProviderInterface = require('../provider-interface');

class WindsurfProvider extends AIProviderInterface {
  constructor() {
    super();
    this.configPath = path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
  }
  
  /**
   * Initialize the Windsurf provider
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (!(await this.isAvailable())) {
      console.log('Windsurf is not available on this system');
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if Windsurf is available on this system
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    // Only relevant for Windows
    if (os.platform() !== 'win32') {
      return false;
    }
    
    try {
      // Check common installation paths for Windsurf
      const homedir = os.homedir();
      const possiblePaths = [
        path.join(homedir, 'AppData', 'Local', 'Programs', 'windsurf', 'Windsurf.exe'),
        path.join('C:', 'Program Files', 'Windsurf', 'Windsurf.exe'),
        path.join('C:', 'Program Files (x86)', 'Windsurf', 'Windsurf.exe')
      ];

      for (const windsurfPath of possiblePaths) {
        try {
          await fs.access(windsurfPath);
          return true;
        } catch (err) {
          // Path doesn't exist, try next one
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking Windsurf availability:', error);
      return false;
    }
  }
  
  /**
   * Configure Windsurf with MCP servers
   * @param {Object} config - Configuration object with server paths
   * @returns {Promise<boolean>} Success status
   */
  async configureMCP(config) {
    // Only relevant for Windows
    if (os.platform() !== 'win32') {
      console.log('Windsurf configuration only supported on Windows');
      return false;
    }
    
    try {
      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Read existing config or create new one
      let mcpConfig = { mcpServers: {} };
      try {
        const existingConfig = await fs.readFile(this.configPath, 'utf8');
        mcpConfig = JSON.parse(existingConfig);
      } catch (error) {
        // File doesn't exist or is invalid, use default
      }
      
      // Resolve server paths to absolute paths
      const githubServerPath = path.resolve(config.serverPaths.github);
      const coverageServerPath = path.resolve(config.serverPaths.coverage);
      
      // Update with DocGen MCP servers
      mcpConfig.mcpServers['docgen-github'] = {
        command: 'node',
        args: [githubServerPath],
        env: {
          GITHUB_TOKEN: '${env:GITHUB_TOKEN}',
          GITHUB_OWNER: '${env:GITHUB_OWNER}',
          GITHUB_REPO: '${env:GITHUB_REPO}',
          PORT: '7867'
        }
      };
      
      mcpConfig.mcpServers['docgen-coverage'] = {
        command: 'node',
        args: [coverageServerPath],
        env: {
          PORT: '7868'
        }
      };
      
      // Write updated config
      await fs.writeFile(this.configPath, JSON.stringify(mcpConfig, null, 2));
      console.log(`Windsurf MCP configuration saved to ${this.configPath}`);
      return true;
    } catch (error) {
      console.error('Error configuring Windsurf MCP:', error);
      return false;
    }
  }
  
  /**
   * Get provider information
   * @returns {Object} Provider metadata
   */
  getInfo() {
    return {
      name: 'Windsurf',
      type: 'IDE',
      version: 'latest',
      configPath: this.configPath
    };
  }
}

// Export a singleton instance
module.exports = new WindsurfProvider();