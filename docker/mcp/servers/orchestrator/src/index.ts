/**
 * MCP Orchestrator for DocGen
 * Coordinates multiple MCP servers and provides a unified API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { healthRouter } from './routes/health';
import { mcpRouter } from './routes/mcp';
import { loadServerConfiguration } from './services/config';
import { authenticateApiKey, rateLimit, initializeApiKeys } from './middleware/auth';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Initialize API keys and server configuration
initializeApiKeys();
loadServerConfiguration();

// Apply authentication and rate limiting middleware to MCP routes
app.use('/mcp', authenticateApiKey, rateLimit, mcpRouter);

// Health routes are not protected
app.use('/health', healthRouter);

// Start server
app.listen(PORT, () => {
  logger.info(`MCP Orchestrator running on port ${PORT}`);
  logger.info('Environment: ' + (process.env.NODE_ENV || 'development'));
  logger.info('Health endpoint: http://localhost:' + PORT + '/health');
  logger.info('MCP endpoint: http://localhost:' + PORT + '/mcp');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
