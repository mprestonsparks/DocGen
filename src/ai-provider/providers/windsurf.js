/**
 * Windsurf IDE AI Provider
 * 
 * This module implements the AI provider interface for Windsurf IDE,
 * allowing DocGen to integrate with Windsurf's Cascade AI on Windows.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const AIProviderInterface = require('../provider-interface');

/**
 * Windsurf IDE Provider implementation
 * Implements the AI Provider Interface for Windsurf IDE
 */
class WindsurfProvider extends AIProviderInterface {
  constructor() {
    super();
    
    // Default config paths
    this.configPath = this._getConfigPath();
    this.isWindows = os.platform() === 'win32';
    this.executablePath = this._getExecutablePath();
  }
  
  /**
   * Get the Windsurf configuration path based on the platform
   * @private
   * @returns {string} Path to the Windsurf MCP configuration file
   */
  _getConfigPath() {
    if (os.platform() === 'win32') {
      return path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
    } else if (os.platform() === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', 'Windsurf', 'mcp_config.json');
    } else {
      // Linux or other - less common
      return path.join(os.homedir(), '.config', 'windsurf', 'mcp_config.json');
    }
  }
  
  /**
   * Get the Windsurf executable path based on the platform
   * @private
   * @returns {string} Path to the Windsurf executable
   */
  _getExecutablePath() {
    if (os.platform() === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'windsurf', 'Windsurf.exe');
    } else if (os.platform() === 'darwin') {
      return '/Applications/Windsurf.app/Contents/MacOS/Windsurf';
    } else {
      // Linux - less common
      return path.join(os.homedir(), '.local', 'bin', 'windsurf');
    }
  }
  
  /**
   * Initialize the Windsurf provider
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Check if Windsurf is available
      if (!(await this.isAvailable())) {
        console.error('Windsurf is not available on this system');
        return false;
      }
      
      // Create config directory if it doesn't exist
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      return true;
    } catch (error) {
      console.error(`Error initializing Windsurf provider: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Check if Windsurf is available on the system
   * @returns {Promise<boolean>} True if Windsurf is available
   */
  async isAvailable() {
    try {
      // Check if Windsurf executable exists
      await fs.access(this.executablePath);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Configure Windsurf with MCP servers
   * @param {Object} config - Configuration object
   * @param {Object} config.serverPaths - Paths to MCP server scripts
   * @param {string} config.serverPaths.github - Path to GitHub MCP server
   * @param {string} config.serverPaths.coverage - Path to Coverage MCP server
   * @param {Object} config.serverEnv - Environment variables for MCP servers
   * @returns {Promise<boolean>} Success status
   */
  async configureMCP(config) {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Read existing config or create new one
      let mcpConfig = { mcpServers: {} };
      try {
        const existingConfig = await fs.readFile(this.configPath, 'utf8');
        mcpConfig = JSON.parse(existingConfig);
      } catch (error) {
        // File doesn't exist or is invalid, use default
        console.log('Creating new Windsurf MCP configuration');
      }
      
      // Format paths correctly for the platform
      const formatPath = (p) => {
        if (this.isWindows) {
          // Use Windows-style paths with double backslashes for JSON
          return path.resolve(p).replace(/\\/g, '\\\\');
        }
        return path.resolve(p);
      };
      
      // Update with DocGen MCP servers
      mcpConfig.mcpServers['docgen-github'] = {
        command: 'node',
        args: [formatPath(config.serverPaths.github)],
        env: {
          GITHUB_TOKEN: '${env:GITHUB_TOKEN}',
          GITHUB_OWNER: '${env:GITHUB_OWNER}',
          GITHUB_REPO: '${env:GITHUB_REPO}',
          PORT: '7867'
        }
      };
      
      mcpConfig.mcpServers['docgen-coverage'] = {
        command: 'node',
        args: [formatPath(config.serverPaths.coverage)],
        env: {
          PORT: '7868'
        }
      };
      
      // Add any additional environment variables
      if (config.serverEnv) {
        Object.assign(mcpConfig.mcpServers['docgen-github'].env, config.serverEnv);
        Object.assign(mcpConfig.mcpServers['docgen-coverage'].env, config.serverEnv);
      }
      
      // Write updated config
      await fs.writeFile(this.configPath, JSON.stringify(mcpConfig, null, 2));
      
      console.log(`Windsurf MCP configuration saved to: ${this.configPath}`);
      return true;
    } catch (error) {
      console.error(`Error configuring Windsurf MCP: ${error.message}`);
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
      platform: this.isWindows ? 'Windows' : os.platform(),
      configPath: this.configPath,
      executablePath: this.executablePath
    };
  }
  
  /**
   * Launch Windsurf IDE
   * @returns {Promise<boolean>} Success status
   */
  async launch() {
    try {
      if (!(await this.isAvailable())) {
        console.error('Windsurf is not available on this system');
        return false;
      }
      
      // Launch Windsurf
      if (this.isWindows) {
        await execPromise(`start "" "${this.executablePath}"`);
      } else if (os.platform() === 'darwin') {
        await execPromise(`open -a Windsurf`);
      } else {
        await execPromise(this.executablePath);
      }
      
      return true;
    } catch (error) {
      console.error(`Error launching Windsurf: ${error.message}`);
      return false;
    }
  }
}

// Export a singleton instance
module.exports = new WindsurfProvider();