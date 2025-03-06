/**
 * Logger utility for DocGen
 */
import winston from 'winston';
import { getLogFilePath, getLogLevel } from './config';

// Create the logger
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'docgen' },
  transports: [
    // Write to log file
    new winston.transports.File({
      filename: getLogFilePath(),
      level: getLogLevel()
    }),
    // Write to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: getLogLevel()
    })
  ]
});

/**
 * Log an error message
 * @param message The message to log
 * @param meta Additional metadata
 */
export const error = (message: string, meta?: Record<string, unknown>): void => {
  logger.error(message, meta);
};

/**
 * Log a warning message
 * @param message The message to log
 * @param meta Additional metadata
 */
export const warn = (message: string, meta?: Record<string, unknown>): void => {
  logger.warn(message, meta);
};

/**
 * Log an info message
 * @param message The message to log
 * @param meta Additional metadata
 */
export const info = (message: string, meta?: Record<string, unknown>): void => {
  logger.info(message, meta);
};

/**
 * Log a debug message
 * @param message The message to log
 * @param meta Additional metadata
 */
export const debug = (message: string, meta?: Record<string, unknown>): void => {
  logger.debug(message, meta);
};

/**
 * Log a verbose message
 * @param message The message to log
 * @param meta Additional metadata
 */
export const verbose = (message: string, meta?: Record<string, unknown>): void => {
  logger.verbose(message, meta);
};

export default logger;