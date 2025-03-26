/**
 * Health route for MCP Orchestrator
 * Provides health check endpoints
 */

import { Router, Request, Response } from 'express';
import { checkAllServersHealth } from '../services/proxy';
import { logger } from '../utils/logger';

export const healthRouter = Router();

/**
 * GET /health
 * Health check endpoint
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    // Check health of all servers
    const serversHealth = await checkAllServersHealth();
    
    // Check if any server is unhealthy
    const unhealthyServers = Object.entries(serversHealth)
      .filter(([_, status]) => status.status === 'error')
      .map(([serverId, _]) => serverId);
    
    if (unhealthyServers.length > 0) {
      // Return degraded status if some servers are unhealthy
      return res.status(200).json({
        status: 'degraded',
        message: `Some servers are unhealthy: ${unhealthyServers.join(', ')}`,
        timestamp: new Date().toISOString(),
        servers: serversHealth
      });
    }
    
    // Return healthy status if all servers are healthy
    return res.status(200).json({
      status: 'ok',
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      servers: serversHealth
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/servers
 * Detailed health check for all servers
 */
healthRouter.get('/servers', async (req: Request, res: Response) => {
  try {
    // Check health of all servers
    const serversHealth = await checkAllServersHealth();
    
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      servers: serversHealth
    });
  } catch (error) {
    logger.error('Server health check failed', { error });
    
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});
