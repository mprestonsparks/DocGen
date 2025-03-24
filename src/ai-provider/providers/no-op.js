/**
 * No-Op AI Provider
 * 
 * This module implements a no-operation (no-op) AI provider that implements
 * the provider interface but doesn't do anything. It's used as a fallback
 * when no other provider is available or as a placeholder for testing.
 */

const AIProviderInterface = require('../provider-interface');

/**
 * No-Op Provider implementation
 * Implements the AI Provider Interface but does nothing
 */
class NoOpProvider extends AIProviderInterface {
  /**
   * Initialize the provider (no-op)
   * @returns {Promise<boolean>} Always returns false
   */
  async initialize() {
    return false;
  }
  
  /**
   * Check if provider is available (no-op)
   * @returns {Promise<boolean>} Always returns false
   */
  async isAvailable() {
    return false;
  }
  
  /**
   * Configure MCP (no-op)
   * @returns {Promise<boolean>} Always returns false
   */
  async configureMCP() {
    return false;
  }
  
  /**
   * Get provider information
   * @returns {Object} Provider metadata
   */
  getInfo() {
    return {
      name: 'No-Op Provider',
      type: 'none',
      description: 'Placeholder provider that does nothing',
      isAvailable: false
    };
  }
}

// Export a singleton instance
module.exports = new NoOpProvider();