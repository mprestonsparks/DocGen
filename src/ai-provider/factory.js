/**
 * AI Provider Factory
 * Creates the appropriate AI provider based on platform detection
 */
const { detectAIProvider } = require('./detect');
const path = require('path');
const fs = require('fs');

/**
 * Create the appropriate AI provider for the current platform
 * @param {Object} config - Optional configuration with explicit provider preference
 * @returns {Object} AI provider instance
 */
function createAIProvider(config = {}) {
  const provider = detectAIProvider(config);
  
  // Return the appropriate provider
  switch(provider) {
    case 'windsurf':
      return require('./providers/windsurf');
    case 'vscode':
      // Placeholder for future support
      console.log('VSCode provider is not yet implemented, falling back to Windsurf');
      return require('./providers/windsurf');
    case 'cursor':
      // Placeholder for future support
      console.log('Cursor provider is not yet implemented, falling back to Windsurf');
      return require('./providers/windsurf');
    case 'claude-code':
      // Don't modify or implement Claude Code, just fall back to a no-op provider on Windows
      if (process.platform === 'win32') {
        return require('./providers/windsurf');
      } else {
        // On Mac, we would return Claude provider but we're not modifying Mac code
        // This should never be reached from Windows
        return createNoOpProvider();
      }
    default:
      console.warn(`Unknown provider '${provider}', using default provider`);
      return process.platform === 'win32' ? 
        require('./providers/windsurf') : 
        createNoOpProvider();
  }
}

/**
 * Creates a no-op provider that doesn't do anything
 * This is only used in fallback situations
 * @returns {Object} No-op provider
 */
function createNoOpProvider() {
  const AIProviderInterface = require('./provider-interface');
  
  return {
    initialize: async () => false,
    isAvailable: async () => false,
    configureMCP: async () => false,
    getInfo: () => ({
      name: 'No-op Provider',
      type: 'Fallback',
      version: '1.0.0'
    })
  };
}

module.exports = createAIProvider;