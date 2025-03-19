/**
 * AI Provider Detection
 * Detects the appropriate AI provider based on the operating system.
 * This module isolates the platform-specific detection logic.
 */
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Detect the appropriate AI provider for the current platform
 * @param {Object} config - Optional configuration with explicit provider preference
 * @returns {String} Provider name ('windsurf' for Windows, 'claude-code' for macOS)
 */
function detectAIProvider(config = {}) {
  // Allow override through config or environment
  if (config.aiProvider) {
    return config.aiProvider;
  }

  if (process.env.DOCGEN_AI_PROVIDER) {
    return process.env.DOCGEN_AI_PROVIDER;
  }

  // Platform detection - Windows uses Windsurf, other platforms use existing provider
  const isWindows = os.platform() === 'win32';
  return isWindows ? 'windsurf' : 'claude-code';
}

/**
 * Check if Windsurf is installed on the system
 * @returns {boolean} True if Windsurf is detected
 */
function isWindsurfInstalled() {
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

    return possiblePaths.some(p => fs.existsSync(p));
  } catch (error) {
    console.error('Error checking for Windsurf installation:', error);
    return false;
  }
}

module.exports = {
  detectAIProvider,
  isWindsurfInstalled
};