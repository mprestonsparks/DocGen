/**
 * Abstract interface for AI providers
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
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} Success status
   */
  async configureMCP(config) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get provider information
   * @returns {Object} Provider metadata
   */
  getInfo() {
    throw new Error('Method not implemented');
  }
}

module.exports = AIProviderInterface;