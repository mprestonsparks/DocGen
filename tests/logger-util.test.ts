/**
 * Tests for the logger utility functions
 */
import * as logger from '../src/utils/logger';
import winston from 'winston';

// Mock winston
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  };
  
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(() => ({})),
      errors: jest.fn(() => ({})),
      splat: jest.fn(() => ({})),
      json: jest.fn(() => ({})),
      colorize: jest.fn(() => ({})),
      simple: jest.fn(() => ({}))
    },
    transports: {
      File: jest.fn(),
      Console: jest.fn()
    }
  };
});

describe('Logger utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should log error messages', () => {
    logger.error('Test error');
    
    const mockLogger = winston.createLogger();
    expect(mockLogger.error).toHaveBeenCalledWith('Test error', undefined);
  });
  
  it('should log error messages with metadata', () => {
    const meta = { code: 'TEST_ERROR', details: 'Some details' };
    logger.error('Test error with metadata', meta);
    
    const mockLogger = winston.createLogger();
    expect(mockLogger.error).toHaveBeenCalledWith('Test error with metadata', meta);
  });
  
  it('should log warning messages', () => {
    logger.warn('Test warning');
    
    const mockLogger = winston.createLogger();
    expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', undefined);
  });
  
  it('should log info messages', () => {
    logger.info('Test info');
    
    const mockLogger = winston.createLogger();
    expect(mockLogger.info).toHaveBeenCalledWith('Test info', undefined);
  });
  
  it('should log debug messages', () => {
    logger.debug('Test debug');
    
    const mockLogger = winston.createLogger();
    expect(mockLogger.debug).toHaveBeenCalledWith('Test debug', undefined);
  });
  
  it('should get named logger', () => {
    const namedLogger = logger.getLogger('test-module');
    expect(namedLogger).toBeDefined();
    expect(namedLogger.info).toBeDefined();
    expect(namedLogger.error).toBeDefined();
    expect(namedLogger.warn).toBeDefined();
    expect(namedLogger.debug).toBeDefined();
  });
});