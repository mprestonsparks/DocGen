/**
 * AI Provider Platform Detection
 * 
 * This module detects the appropriate AI provider based on the current platform
 * and environment settings. It determines whether to use Claude Code, Windsurf,
 * or other AI providers based on availability and user preferences.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Detects the most appropriate AI provider for the current platform
 * @param {Object} options - Detection options
 * @param {boolean} [options.forceWindsurf] - Force using Windsurf regardless of platform
 * @param {boolean} [options.forceClaudeCode] - Force using Claude Code regardless of platform
 * @returns {string} The detected provider name ('claude-code', 'windsurf', etc.)
 */
function detectAIProvider(options = {}) {
  // Check for explicit environment variable or option overrides
  if (process.env.DOCGEN_AI_PROVIDER) {
    return process.env.DOCGEN_AI_PROVIDER;
  }
  
  if (options.forceWindsurf) {
    return 'windsurf';
  }
  
  if (options.forceClaudeCode) {
    return 'claude-code';
  }
  
  // Platform detection
  const isWindows = os.platform() === 'win32';
  const isMac = os.platform() === 'darwin';
  
  // Check for Claude CLI availability on macOS
  if (isMac) {
    try {
      // Check if Claude CLI is installed
      execSync('which claude', { stdio: 'ignore' });
      return 'claude-code';
    } catch (error) {
      // Claude CLI not found, check for Windsurf as fallback
      if (isWindsurfAvailable()) {
        return 'windsurf';
      }
      // No AI provider available
      return 'none';
    }
  }
  
  // On Windows, check for Windsurf
  if (isWindows) {
    if (isWindsurfAvailable()) {
      return 'windsurf';
    }
    // Check for other Windows AI providers here (VSCode, Cursor, etc.)
    
    // No AI provider available
    return 'none';
  }
  
  // Linux or other platforms - limited support currently
  return 'none';
}

/**
 * Check if Windsurf is available on the system
 * @returns {boolean} True if Windsurf is available
 */
function isWindsurfAvailable() {
  // Windows-specific check
  if (os.platform() === 'win32') {
    const windsurfPath = path.join(
      os.homedir(), 
      'AppData', 
      'Local', 
      'Programs', 
      'windsurf', 
      'Windsurf.exe'
    );
    return fs.existsSync(windsurfPath);
  }
  
  // macOS check (less common but possible)
  if (os.platform() === 'darwin') {
    const windsurfPath = path.join(
      '/Applications',
      'Windsurf.app'
    );
    return fs.existsSync(windsurfPath);
  }
  
  // Not available on other platforms
  return false;
}

module.exports = {
  detectAIProvider,
  isWindsurfAvailable
};