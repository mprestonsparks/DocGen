/**
 * AI Provider Factory
 * 
 * This module creates the appropriate AI provider instance based on the detected
 * platform. It uses the factory pattern to instantiate the correct provider class
 * while maintaining a consistent interface for all providers.
 */

const { detectAIProvider } = require('./detect');
const path = require('path');

/**
 * Creates and returns the appropriate AI provider for the current platform
 * @param {Object} options - Options to pass to detection and providers
 * @returns {Object} An instantiated AI provider that implements the provider interface
 */
function createAIProvider(options = {}) {
  const providerName = detectAIProvider(options);
  let provider;
  
  try {
    switch (providerName) {
      case 'windsurf':
        provider = require('./providers/windsurf');
        break;
      case 'claude-code':
        provider = require('./providers/claude-code');
        break;
      case 'vscode':
        // Future support
        provider = require('./providers/vscode');
        break;
      case 'cursor':
        // Future support
        provider = require('./providers/cursor');
        break;
      case 'none':
      default:
        // Return a no-op provider that implements the interface but does nothing
        provider = require('./providers/no-op');
        break;
    }
    
    return provider;
  } catch (error) {
    console.error(`Error creating AI provider '${providerName}': ${error.message}`);
    
    // Graceful fallback - either return a no-op provider or try another one
    try {
      return require('./providers/no-op');
    } catch (fallbackError) {
      // Last resort - create a minimal in-memory provider that implements the interface
      const AIProviderInterface = require('./provider-interface');
      
      return {
        initialize: async () => false,
        isAvailable: async () => false,
        configureMCP: async () => false,
        getInfo: () => ({ 
          name: 'Fallback Provider', 
          type: 'none',
          version: '0.0.0',
          error: error.message
        })
      };
    }
  }
}

/**
 * Get a list of all available AI providers on this system
 * @returns {Promise<Array<string>>} List of available provider names
 */
async function getAvailableProviders() {
  const availableProviders = [];
  
  // Try to load each provider and check if it's available
  const potentialProviders = ['claude-code', 'windsurf', 'vscode', 'cursor'];
  
  for (const providerName of potentialProviders) {
    try {
      const provider = require(`./providers/${providerName}`);
      if (await provider.isAvailable()) {
        availableProviders.push(providerName);
      }
    } catch (error) {
      // Provider module not found or error checking availability, skip it
      continue;
    }
  }
  
  return availableProviders;
}

module.exports = {
  createAIProvider,
  getAvailableProviders
};