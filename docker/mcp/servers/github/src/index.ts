/**
 * GitHub MCP Server for DocGen
 * Provides GitHub integration capabilities through the Model Context Protocol
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { healthRouter } from './routes/health';
import { mcpRouter } from './routes/mcp';
import { setupGitHubClient } from './services/github';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/mcp', mcpRouter);

// Initialize GitHub client
setupGitHubClient();

// Start server
app.listen(PORT, () => {
  logger.info(`GitHub MCP Server running on port ${PORT}`);
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

export default app;
