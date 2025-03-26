/**
 * Configuration service for MCP Orchestrator
 * Loads server configuration from YAML file
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger, logError } from '../utils/logger';

// Type definitions for server configuration
export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  type: string;
  apiKey?: string;
  priority: number;
  capabilities?: string[];
}

export interface RoutingConfig {
  servers: ServerConfig[];
  routes: {
    [method: string]: {
      server: string;
      fallback?: string;
    };
  };
}

// Global configuration
let config: RoutingConfig | null = null;

/**
 * Load server configuration from YAML file
 */
export const loadServerConfiguration = (): void => {
  try {
    // Path to configuration file
    const configPath = process.env.CONFIG_PATH || '/etc/mcp/routing.yaml';
    
    if (!fs.existsSync(configPath)) {
      logger.warn(`Configuration file not found at ${configPath}. Using default configuration.`);
      
      // Create default configuration
      config = {
        servers: [
          {
            id: 'main',
            name: 'Main MCP Server',
            url: process.env.MAIN_MCP_URL || 'http://mcp-main:3200',
            type: 'main',
            priority: 1,
            capabilities: [
              'document.generate',
              'document.generate.stream',
              'code.complete',
              'semantic.analyze',
              'nlp.process',
              'fs.readFile',
              'fs.writeFile',
              'fs.listFiles',
              'fs.deleteFile'
            ]
          },
          {
            id: 'github',
            name: 'GitHub MCP Server',
            url: process.env.GITHUB_MCP_URL || 'http://mcp-github:3000',
            type: 'github',
            priority: 2,
            capabilities: [
              'github.repository.info',
              'github.issues.list',
              'github.issues.create',
              'github.pullRequests.list',
              'github.pullRequests.get',
              'github.pullRequests.create',
              'github.pullRequests.merge',
              'github.pullRequests.getReviews',
              'github.pullRequests.createReview'
            ]
          }
        ],
        routes: {
          // Document generation routes
          'document.generate': { server: 'main' },
          'document.generate.stream': { server: 'main' },
          'code.complete': { server: 'main' },
          'semantic.analyze': { server: 'main' },
          'nlp.process': { server: 'main' },
          
          // File system routes
          'fs.readFile': { server: 'main' },
          'fs.writeFile': { server: 'main' },
          'fs.listFiles': { server: 'main' },
          'fs.deleteFile': { server: 'main' },
          
          // GitHub routes
          'github.repository.info': { server: 'github' },
          'github.issues.list': { server: 'github' },
          'github.issues.create': { server: 'github' },
          'github.pullRequests.list': { server: 'github' },
          'github.pullRequests.get': { server: 'github' },
          'github.pullRequests.create': { server: 'github' },
          'github.pullRequests.merge': { server: 'github' },
          'github.pullRequests.getReviews': { server: 'github' },
          'github.pullRequests.createReview': { server: 'github' }
        }
      };
      
      return;
    }
    
    // Load configuration from file
    const fileContent = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(fileContent) as RoutingConfig;
    
    logger.info(`Loaded server configuration from ${configPath}`);
    logger.info(`Configured ${config.servers.length} servers`);
    logger.info(`Configured ${Object.keys(config.routes).length} routes`);
  } catch (error) {
    logError('Failed to load server configuration', error as Error);
    throw error;
  }
};

/**
 * Get server configuration
 */
export const getServerConfig = (): RoutingConfig => {
  if (!config) {
    loadServerConfiguration();
  }
  
  return config as RoutingConfig;
};

/**
 * Get server for method
 */
export const getServerForMethod = (method: string): ServerConfig | null => {
  if (!config) {
    loadServerConfiguration();
  }
  
  const route = config?.routes[method];
  
  if (!route) {
    return null;
  }
  
  const server = config?.servers.find(s => s.id === route.server);
  
  if (!server) {
    // Try fallback server if specified
    if (route.fallback) {
      return config?.servers.find(s => s.id === route.fallback) || null;
    }
    
    return null;
  }
  
  return server;
};

/**
 * Get all servers
 */
export const getAllServers = (): ServerConfig[] => {
  if (!config) {
    loadServerConfiguration();
  }
  
  return config?.servers || [];
};
