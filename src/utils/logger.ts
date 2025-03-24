/**
 * Logger utility for DocGen
 */
import { LogLevel } from '../core/types/logging';
import { getLogLevel, getLogFilePath } from './config';

/**
 * Log a message at the specified level
 */
export const log = (level: LogLevel, message: string, metadata?: Record<string, unknown>): void => {
  const logLevel = getLogLevel();
  const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  
  if (logLevels.indexOf(level) >= logLevels.indexOf(logLevel as LogLevel)) {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level,
      message,
      ...(metadata || {}),
    };
    console.log(JSON.stringify(logMessage));
  }
};

/**
 * Log a debug message
 */
export const debug = (message: string, metadata?: Record<string, unknown>): void => {
  log('debug', message, metadata);
};

/**
 * Log an info message
 */
export const info = (message: string, metadata?: Record<string, unknown>): void => {
  log('info', message, metadata);
};

/**
 * Log a warning message
 */
export const warn = (message: string, metadata?: Record<string, unknown>): void => {
  log('warn', message, metadata);
};

/**
 * Log an error message
 */
export const error = (message: string, metadata?: Record<string, unknown>): void => {
  log('error', message, metadata);
};