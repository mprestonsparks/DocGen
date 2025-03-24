/**
 * Abstract Interface for AI Providers
 * 
 * This file defines the common interface that all AI providers must implement.
 * It allows DocGen to work with different AI assistants (Claude Code, Windsurf, etc.)
 * in a consistent way regardless of the underlying implementation.
 */

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /**
   * Server paths and settings
   */
  servers: {
    /**
     * MCP server URL
     */
    mcpUrl: string;
    
    /**
     * Websocket server URL
     */
    wsUrl: string;
    
    /**
     * API key if required
     */
    apiKey?: string;
  };
  
  /**
   * Additional provider-specific settings
   */
  settings?: Record<string, any>;
}

/**
 * Provider metadata
 */
export interface ProviderInfo {
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Provider type (e.g., 'claude', 'windsurf', etc.)
   */
  type: string;
  
  /**
   * Provider version
   */
  version: string;
  
  /**
   * Provider capabilities
   */
  capabilities: string[];
}

/**
 * Abstract AI Provider Interface
 * All concrete providers must implement these methods
 */
export interface AIProvider {
  /**
   * Initialize the AI provider
   */
  initialize(): Promise<boolean>;
  
  /**
   * Check if the provider is available on this system
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Configure the provider with MCP servers
   */
  configureMCP(config: ProviderConfig): Promise<boolean>;
  
  /**
   * Get provider information
   */
  getInfo(): ProviderInfo;
}
