/**
 * Logger utility for GitHub MCP Server
 */

import winston from 'winston';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? '\n' + stack : ''}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport for all environments
    new winston.transports.Console(),
    
    // File transport for production
    ...(process.env.NODE_ENV === 'production' 
      ? [
          new winston.transports.File({ 
            filename: '/app/data/error.log', 
            level: 'error' 
          }),
          new winston.transports.File({ 
            filename: '/app/data/combined.log' 
          })
        ] 
      : [])
  ]
});

// Export a function to log errors with stack traces
export const logError = (message: string, error: Error): void => {
  logger.error(`${message}: ${error.message}`, { stack: error.stack });
};
