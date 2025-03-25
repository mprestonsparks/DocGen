/**
 * Main MCP Server for DocGen
 * Provides document generation and language processing capabilities through the Model Context Protocol
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { healthRouter } from './routes/health';
import { mcpRouter } from './routes/mcp';
import { setupAnthropicClient } from './services/anthropic';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3200;
const HEALTH_PORT = process.env.HEALTH_PORT || 8800;

// Create separate app for health checks
const healthApp = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
healthApp.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/mcp', mcpRouter);
healthApp.use('/health', healthRouter);

// Initialize Anthropic client
setupAnthropicClient();

// Start servers
app.listen(PORT, () => {
  logger.info(`Main MCP Server running on port ${PORT}`);
  logger.info('Environment: ' + (process.env.NODE_ENV || 'development'));
  logger.info('MCP endpoint: http://localhost:' + PORT + '/mcp');
});

healthApp.listen(HEALTH_PORT, () => {
  logger.info(`Health server running on port ${HEALTH_PORT}`);
  logger.info('Health endpoint: http://localhost:' + HEALTH_PORT + '/health');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
