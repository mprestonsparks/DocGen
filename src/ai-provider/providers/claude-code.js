/**
 * Claude Code AI Provider
 * 
 * This module implements the AI provider interface for Claude Code CLI,
 * allowing DocGen to integrate with Claude Code on macOS.
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

const AIProviderInterface = require('../provider-interface');

/**
 * Claude Code Provider implementation
 * Implements the AI Provider Interface for Claude Code CLI
 */
class ClaudeCodeProvider extends AIProviderInterface {
  /**
   * Initialize the Claude Code provider
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Check if Claude CLI is available
      if (!(await this.isAvailable())) {
        console.error('Claude Code CLI is not available on this system');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error initializing Claude Code provider: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Check if Claude Code is available on the system
   * @returns {Promise<boolean>} True if Claude Code is available
   */
  async isAvailable() {
    // Only available on macOS
    if (os.platform() !== 'darwin') {
      return false;
    }
    
    try {
      // Check if Claude CLI is installed
      const { stdout } = await execPromise('which claude');
      return Boolean(stdout && stdout.trim());
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Configure Claude Code with MCP servers
   * Claude Code automatically detects running MCP servers, so we only need to
   * register them for explicit use.
   * 
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} Success status
   */
  async configureMCP(config) {
    try {
      // Claude Code detects running MCP servers automatically,
      // but we can explicitly register them if needed
      
      // Check if config contains options to force MCP registration
      if (config && config.forceRegister) {
        // GitHub MCP registration
        try {
          await execPromise(`claude mcp remove github --scope user`);
          await execPromise(`claude mcp add-http github http://localhost:7867 --scope user`);
          console.log('GitHub MCP registered with Claude Code');
        } catch (error) {
          console.warn(`Warning: Could not register GitHub MCP: ${error.message}`);
        }
        
        // Coverage MCP registration
        try {
          await execPromise(`claude mcp remove coverage --scope user`);
          await execPromise(`claude mcp add-http coverage http://localhost:7868 --scope user`);
          console.log('Coverage MCP registered with Claude Code');
        } catch (error) {
          console.warn(`Warning: Could not register Coverage MCP: ${error.message}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error configuring Claude Code MCP: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get provider information
   * @returns {Object} Provider metadata
   */
  getInfo() {
    return {
      name: 'Claude Code',
      type: 'CLI',
      platform: 'macOS',
      version: this._getVersion()
    };
  }
  
  /**
   * Get the Claude CLI version
   * @private
   * @returns {string} Version number or 'unknown'
   */
  _getVersion() {
    try {
      // Try to get the Claude CLI version synchronously
      const { stdout } = exec('claude --version', { encoding: 'utf8' });
      return stdout ? stdout.trim() : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
  
  /**
   * Check if specific MCP servers are registered with Claude
   * @returns {Promise<Object>} Status of each MCP server
   */
  async checkMcpStatus() {
    try {
      const { stdout } = await execPromise('claude mcp list --scope user');
      
      // Parse the output to check if our MCPs are registered
      const isGithubRegistered = stdout.includes('github');
      const isCoverageRegistered = stdout.includes('coverage');
      
      return {
        github: isGithubRegistered,
        coverage: isCoverageRegistered,
        allRegistered: isGithubRegistered && isCoverageRegistered
      };
    } catch (error) {
      console.error(`Error checking Claude MCP status: ${error.message}`);
      return {
        github: false,
        coverage: false,
        allRegistered: false,
        error: error.message
      };
    }
  }
}

// Export a singleton instance
module.exports = new ClaudeCodeProvider();