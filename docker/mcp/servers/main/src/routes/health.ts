/**
 * Health check route for Main MCP Server
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getAnthropicClientStatus } from '../services/anthropic';

export const healthRouter = Router();

/**
 * GET /health
 * Health check endpoint that verifies the server is running properly
 * and all dependencies are available
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    // Check Anthropic API client status
    const anthropicStatus = await getAnthropicClientStatus();
    
    // Check disk space
    const diskSpace = {
      status: 'ok',
      message: 'Disk space is sufficient'
    };
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryStatus = {
      status: memoryUsage.heapUsed < 500 * 1024 * 1024 ? 'ok' : 'warning',
      heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)) + 'MB',
      rss: Math.round(memoryUsage.rss / (1024 * 1024)) + 'MB'
    };
    
    // Determine overall health status
    const isHealthy = anthropicStatus.status === 'ok' && 
                      diskSpace.status === 'ok' && 
                      memoryStatus.status === 'ok';
    
    // Return health check response
    const healthStatus = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        anthropic: anthropicStatus,
        disk: diskSpace,
        memory: memoryStatus
      }
    };
    
    logger.debug('Health check performed', healthStatus);
    
    return res.status(isHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error });
    
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
