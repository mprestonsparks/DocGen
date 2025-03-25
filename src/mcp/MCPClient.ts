/**
 * MCP Client - Interface for interacting with MCP servers
 * 
 * This client provides methods to communicate with MCP servers through the gateway.
 * It handles connection management, request routing, and error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Configuration options for the MCP Client
 */
export interface MCPClientConfig {
  /** Base URL for the MCP Gateway (default: http://localhost:8950) */
  gatewayUrl?: string;
  /** Default timeout for requests in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
}

/**
 * MCP Server health status response
 */
export interface MCPServerStatus {
  status: 'UP' | 'DOWN';
  servers: number;
}

/**
 * MCP Server error response
 */
export interface MCPErrorResponse {
  error: string;
  code: string;
  details?: Record<string, any>;
}

/**
 * MCP Request options
 */
export interface MCPRequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to retry failed requests */
  retry?: boolean;
  /** Additional request headers */
  headers?: Record<string, string>;
}

/**
 * MCP Model Context Result
 */
export interface MCPContextResult {
  modelId: string;
  context: string;
  metadata?: Record<string, any>;
}

/**
 * Client for interacting with MCP servers
 */
export class MCPClient {
  private axios: AxiosInstance;
  private config: Required<MCPClientConfig>;
  
  /**
   * Create a new MCP Client
   * 
   * @param config Configuration options for the client
   */
  constructor(config: MCPClientConfig = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl || 'http://localhost:8950',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    };
    
    this.axios = axios.create({
      baseURL: this.config.gatewayUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Only retry idempotent requests (GET, HEAD, OPTIONS)
        const isIdempotent = ['get', 'head', 'options'].includes(config.method);
        if (!isIdempotent || !config.retry || config._retryCount >= this.config.maxRetries) {
          return Promise.reject(error);
        }
        
        // Initialize retry count
        config._retryCount = config._retryCount || 0;
        config._retryCount += 1;
        
        // Create new promise to handle retry after delay
        const retryDelay = this.config.retryDelay;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        
        // Retry the request
        return this.axios(config);
      }
    );
  }
  
  /**
   * Check the status of the MCP server gateway
   * 
   * @returns Promise resolving to the server status
   */
  async getStatus(): Promise<MCPServerStatus> {
    try {
      const response = await this.axios.get<MCPServerStatus>('/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  /**
   * Get context for a document using the specified model
   * 
   * @param documentId The document ID to get context for
   * @param options Request options
   * @returns Promise resolving to the context result
   */
  async getContext(documentId: string, options?: MCPRequestOptions): Promise<MCPContextResult> {
    try {
      const config: AxiosRequestConfig = {
        timeout: options?.timeout,
        headers: options?.headers,
        retry: options?.retry ?? true
      };
      
      const response = await this.axios.get<MCPContextResult>(`/context/${documentId}`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  /**
   * Process a document to extract context using the specified model
   * 
   * @param content The document content to process
   * @param modelId Optional model ID to use for processing
   * @param options Request options
   * @returns Promise resolving to the context result
   */
  async processDocument(
    content: string,
    modelId?: string,
    options?: MCPRequestOptions
  ): Promise<MCPContextResult> {
    try {
      const config: AxiosRequestConfig = {
        timeout: options?.timeout,
        headers: options?.headers,
        retry: options?.retry ?? true
      };
      
      const payload = {
        content,
        modelId
      };
      
      const response = await this.axios.post<MCPContextResult>('/process', payload, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  /**
   * Handle errors from the MCP server
   * 
   * @param error The error object from Axios
   * @returns A standardized error object
   */
  private handleError(error: any): Error {
    // Handle Axios errors
    if (error.response) {
      // Server responded with an error status
      const data = error.response.data as MCPErrorResponse;
      return new Error(`MCP Server Error (${data.code}): ${data.error}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error(`MCP Server Connection Error: No response received`);
    } else {
      // Error in setting up the request
      return new Error(`MCP Client Error: ${error.message}`);
    }
  }
}
