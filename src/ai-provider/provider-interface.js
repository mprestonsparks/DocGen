/**
 * Abstract Interface for AI Providers
 * 
 * This file defines the common interface that all AI providers must implement.
 * It allows DocGen to work with different AI assistants (Claude Code, Windsurf, etc.)
 * in a consistent way regardless of the underlying implementation.
 */

/**
 * Abstract AI Provider Interface
 * All concrete providers must implement these methods
 */
class AIProviderInterface {
  /**
   * Initialize the AI provider
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if the provider is available on this system
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Configure the provider with MCP servers
   * @param {Object} config - Configuration object with server paths and settings
   * @returns {Promise<boolean>} Success status
   */
  async configureMCP(config) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get provider information
   * @returns {Object} Provider metadata (name, type, version, etc.)
   */
  getInfo() {
    throw new Error('Method not implemented');
  }
}

module.exports = AIProviderInterface;