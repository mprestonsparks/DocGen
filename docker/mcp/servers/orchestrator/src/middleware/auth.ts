/**
 * Authentication middleware for MCP Orchestrator
 * Provides API key validation and rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger, logError } from '../utils/logger';

// In-memory store for API keys and rate limiting
// In a production environment, this would be replaced with Redis or another distributed cache
interface RateLimitInfo {
  count: number;
  resetAt: number;
  clientId: string;
}

const rateLimits = new Map<string, RateLimitInfo>();
const apiKeys = new Map<string, string>();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 100; // Maximum requests per window

/**
 * Initialize API keys from file or environment variables
 */
export const initializeApiKeys = (): void => {
  try {
    // Read API keys from file
    const keyPath = '/run/secrets/mcp_api_keys';
    
    if (fs.existsSync(keyPath)) {
      const keysContent = fs.readFileSync(keyPath, 'utf8');
      const keys = keysContent.split('\n').filter(Boolean);
      
      keys.forEach(line => {
        const [clientId, apiKey] = line.split(':');
        if (clientId && apiKey) {
          apiKeys.set(apiKey.trim(), clientId.trim());
          logger.info(`Loaded API key for client: ${clientId}`);
        }
      });
    } else {
      // Fallback to environment variables
      const envKeys = process.env.MCP_API_KEYS || '';
      const keys = envKeys.split(',').filter(Boolean);
      
      keys.forEach(keyPair => {
        const [clientId, apiKey] = keyPair.split(':');
        if (clientId && apiKey) {
          apiKeys.set(apiKey.trim(), clientId.trim());
          logger.info(`Loaded API key for client: ${clientId}`);
        }
      });
    }
    
    if (apiKeys.size === 0) {
      // Generate a default API key for development
      if (process.env.NODE_ENV === 'development') {
        const defaultApiKey = uuidv4();
        const defaultClientId = 'default-client';
        apiKeys.set(defaultApiKey, defaultClientId);
        logger.warn(`No API keys found. Generated default API key for development: ${defaultApiKey}`);
      } else {
        logger.error('No API keys found. Authentication will fail for all requests.');
      }
    }
  } catch (error) {
    logError('Failed to initialize API keys', error as Error);
  }
};

/**
 * Authenticate API key
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip authentication for health checks and capabilities endpoint
    if (req.path === '/health' || req.path === '/capabilities') {
      return next();
    }
    
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized: API key is required'
        },
        id: req.body.id || null
      });
      return;
    }
    
    const clientId = apiKeys.get(apiKey);
    
    if (!clientId) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized: Invalid API key'
        },
        id: req.body.id || null
      });
      return;
    }
    
    // Store client ID in request for later use
    req.headers['x-client-id'] = clientId;
    
    next();
  } catch (error) {
    logError('Authentication failed', error as Error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Internal server error'
      },
      id: req.body.id || null
    });
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip rate limiting for health checks and capabilities endpoint
    if (req.path === '/health' || req.path === '/capabilities') {
      return next();
    }
    
    const clientId = req.headers['x-client-id'] as string;
    
    if (!clientId) {
      // This should not happen if authentication middleware is used before rate limiting
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Internal server error: Client ID not found'
        },
        id: req.body.id || null
      });
      return;
    }
    
    const now = Date.now();
    let rateLimit = rateLimits.get(clientId);
    
    // If rate limit info doesn't exist or window has expired, create a new one
    if (!rateLimit || rateLimit.resetAt < now) {
      rateLimit = {
        count: 0,
        resetAt: now + RATE_LIMIT_WINDOW,
        clientId
      };
    }
    
    // Increment request count
    rateLimit.count++;
    rateLimits.set(clientId, rateLimit);
    
    // Check if rate limit is exceeded
    if (rateLimit.count > RATE_LIMIT_MAX_REQUESTS) {
      const resetInSeconds = Math.ceil((rateLimit.resetAt - now) / 1000);
      
      res.status(429).json({
        jsonrpc: '2.0',
        error: {
          code: -32002,
          message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds`
        },
        id: req.body.id || null
      });
      return;
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', (RATE_LIMIT_MAX_REQUESTS - rateLimit.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());
    
    next();
  } catch (error) {
    logError('Rate limiting failed', error as Error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Internal server error'
      },
      id: req.body.id || null
    });
  }
};
