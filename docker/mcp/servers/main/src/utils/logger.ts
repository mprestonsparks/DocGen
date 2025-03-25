/**
 * Logger utility for Main MCP Server
 */

import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'main-mcp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Helper function for logging errors
export const logError = (message: string, error: Error): void => {
  logger.error(message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
};

export { logger };
