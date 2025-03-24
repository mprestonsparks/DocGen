/**
 * Platform detection and utilities for cross-platform compatibility
 */
const os = require('os');
const path = require('path');

/**
 * Platform detection object with utility functions
 */
const platform = {
  // Platform detection
  isWindows: os.platform() === 'win32',
  isMac: os.platform() === 'darwin',
  isLinux: os.platform() === 'linux',
  isUnix: os.platform() !== 'win32', // macOS and Linux
  
  // Path utilities
  pathSeparator: path.sep,
  
  // Environment utilities
  homeDir: os.homedir(),
  tempDir: os.tmpdir(),
  
  /**
   * Normalizes a path for the current platform
   * @param {string} inputPath - Path to normalize
   * @returns {string} - Normalized path for current platform
   */
  normalizePath(inputPath) {
    return path.normalize(inputPath);
  },
  
  /**
   * Converts a path to use forward slashes (for Docker paths)
   * @param {string} inputPath - Path to convert
   * @returns {string} - Path with forward slashes
   */
  toDockerPath(inputPath) {
    return inputPath.replace(/\\/g, '/');
  },
  
  /**
   * Gets the appropriate script extension for the current platform
   * @returns {string} - Script extension (.sh for Unix, .ps1 for Windows)
   */
  getScriptExtension() {
    return this.isWindows ? '.ps1' : '.sh';
  },
  
  /**
   * Determines if Docker is available on the system
   * This is a placeholder - actual implementation would check for Docker
   * @returns {boolean} - True if Docker is available
   */
  isDockerAvailable() {
    // In a real implementation, this would check if Docker is installed and running
    // For now, we'll assume it's available
    return true;
  }
};

module.exports = platform;
