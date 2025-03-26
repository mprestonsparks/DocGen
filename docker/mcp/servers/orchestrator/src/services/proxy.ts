/**
 * Proxy service for MCP Orchestrator
 * Forwards requests to the appropriate MCP server
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getServerForMethod, getAllServers, ServerConfig } from './config';
import { logger, logError } from '../utils/logger';

// Type definitions for proxy service
export interface ProxyRequest {
  method: string;
  params?: any;
  id: string;
}

export interface ProxyResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: string;
}

export interface ServerCapabilities {
  [key: string]: {
    version: string;
    methods: string[];
  };
}

/**
 * Forward request to appropriate MCP server
 */
export const forwardRequest = async (
  request: ProxyRequest
): Promise<ProxyResponse> => {
  try {
    const { method, params, id } = request;
    
    // Get server for method
    const server = getServerForMethod(method);
    
    if (!server) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        },
        id
      };
    }
    
    // Forward request to server
    const response = await axios.post<ProxyResponse>(
      `${server.url}/mcp`,
      {
        jsonrpc: '2.0',
        method,
        params,
        id
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey ? { 'X-API-Key': server.apiKey } : {})
        },
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    return response.data;
  } catch (error) {
    logError('Failed to forward request', error as Error);
    
    // Handle different types of errors
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        return {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Server error: ${error.response.status} ${error.response.statusText}`
          },
          id: request.id
        };
      } else if (error.request) {
        // The request was made but no response was received
        return {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'No response from server'
          },
          id: request.id
        };
      }
    }
    
    // Something happened in setting up the request that triggered an Error
    return {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      id: request.id
    };
  }
};

/**
 * Get capabilities from all servers
 */
export const getAllCapabilities = async (): Promise<ServerCapabilities> => {
  try {
    const servers = getAllServers();
    const capabilities: ServerCapabilities = {};
    
    // Get capabilities from each server
    for (const server of servers) {
      try {
        const response = await axios.get<ServerCapabilities>(
          `${server.url}/mcp/capabilities`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(server.apiKey ? { 'X-API-Key': server.apiKey } : {})
            },
            timeout: 5000 // 5 seconds timeout
          }
        );
        
        // Merge capabilities
        Object.entries(response.data).forEach(([key, value]) => {
          if (!capabilities[key]) {
            capabilities[key] = value;
          } else {
            // Merge methods
            capabilities[key].methods = [
              ...new Set([...capabilities[key].methods, ...value.methods])
            ];
            
            // Use highest version
            if (parseFloat(value.version) > parseFloat(capabilities[key].version)) {
              capabilities[key].version = value.version;
            }
          }
        });
      } catch (error) {
        logError(`Failed to get capabilities from server ${server.id}`, error as Error);
      }
    }
    
    return capabilities;
  } catch (error) {
    logError('Failed to get all capabilities', error as Error);
    return {};
  }
};

/**
 * Check health of all servers
 */
export const checkAllServersHealth = async (): Promise<{
  [serverId: string]: {
    status: 'ok' | 'error';
    message: string;
  };
}> => {
  try {
    const servers = getAllServers();
    const healthStatus: {
      [serverId: string]: {
        status: 'ok' | 'error';
        message: string;
      };
    } = {};
    
    // Check health of each server
    for (const server of servers) {
      try {
        const response = await axios.get(
          `${server.url.replace(/\/mcp$/, '')}/health`,
          {
            timeout: 5000 // 5 seconds timeout
          }
        );
        
        healthStatus[server.id] = {
          status: 'ok',
          message: `Server is healthy: ${response.status} ${response.statusText}`
        };
      } catch (error) {
        healthStatus[server.id] = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return healthStatus;
  } catch (error) {
    logError('Failed to check health of all servers', error as Error);
    return {};
  }
};
