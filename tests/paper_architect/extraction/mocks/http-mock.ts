/**
 * HTTP client mock implementation for extraction tests
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

export interface HttpResponse {
  statusCode: number;
  headers?: Record<string, string>;
  data?: string | Buffer;
  error?: Error;
}

export interface HttpClientMock {
  request: jest.Mock;
  get: jest.Mock;
  post: jest.Mock;
}

/**
 * Creates mock HTTP response suitable for GROBID API responses
 */
export function createHttpResponse(config: HttpResponse): any {
  const response = new EventEmitter();
  
  // Set status code and headers
  Object.defineProperty(response, 'statusCode', {
    value: config.statusCode
  });
  
  if (config.headers) {
    Object.defineProperty(response, 'headers', {
      value: config.headers
    });
  }
  
  // Setup for next tick to allow proper async behavior
  process.nextTick(() => {
    if (config.error) {
      response.emit('error', config.error);
    } else {
      if (config.data) {
        response.emit('data', config.data);
      }
      response.emit('end');
    }
  });
  
  // Add standard methods
  response.setEncoding = jest.fn().mockReturnThis();
  
  return response;
}

/**
 * Creates a mock HTTP client with configurable response behavior
 */
export function createHttpMock(defaultResponse?: HttpResponse): HttpClientMock {
  const defaultConfig: HttpResponse = defaultResponse || {
    statusCode: 200,
    data: '<TEI><teiHeader><fileDesc><titleStmt><title>Mock Paper</title></titleStmt></fileDesc></teiHeader></TEI>'
  };
  
  // Create request implementation that supports both callback and async styles
  const requestImpl = jest.fn().mockImplementation((url, options, callback) => {
    const req = new EventEmitter();
    req.end = jest.fn(() => {
      if (callback) {
        const response = createHttpResponse(defaultConfig);
        callback(response);
      }
    });
    
    // Handle piping
    req.pipe = jest.fn().mockReturnThis();
    
    // Return a stream-like object for the request
    return req;
  });
  
  return {
    request: requestImpl,
    get: jest.fn().mockImplementation((url, options, callback) => {
      return requestImpl(url, { ...options, method: 'GET' }, callback);
    }),
    post: jest.fn().mockImplementation((url, options, callback) => {
      return requestImpl(url, { ...options, method: 'POST' }, callback);
    })
  };
}

/**
 * Sets up common HTTP scenarios for testing
 */
export function setupHttpScenario(httpMock: HttpClientMock, scenario: 'success' | 'timeout' | 'server-error' | 'connection-error' | 'malformed-response'): HttpClientMock {
  // Reset mocks
  Object.values(httpMock).forEach(mock => mock.mockReset());
  
  let responseConfig: HttpResponse;
  
  switch (scenario) {
    case 'timeout':
      responseConfig = {
        statusCode: 0,
        error: new Error('ETIMEDOUT: Connection timed out')
      };
      break;
      
    case 'server-error':
      responseConfig = {
        statusCode: 500,
        data: 'Internal Server Error'
      };
      break;
      
    case 'connection-error':
      responseConfig = {
        statusCode: 0,
        error: new Error('ECONNREFUSED: Connection refused')
      };
      break;
      
    case 'malformed-response':
      responseConfig = {
        statusCode: 200,
        data: '<malformed>XML<data>'
      };
      break;
      
    case 'success':
    default:
      responseConfig = {
        statusCode: 200,
        data: '<TEI><teiHeader><fileDesc><titleStmt><title>Test Paper</title></titleStmt></fileDesc></teiHeader></TEI>'
      };
      break;
  }
  
  // Setup request implementation with the scenario
  httpMock.request.mockImplementation((url, options, callback) => {
    const req = new EventEmitter();
    req.end = jest.fn(() => {
      if (callback) {
        const response = createHttpResponse(responseConfig);
        callback(response);
      }
    });
    
    // For connection errors, emit on the request object
    if (scenario === 'connection-error') {
      process.nextTick(() => {
        req.emit('error', responseConfig.error);
      });
    }
    
    req.pipe = jest.fn().mockReturnThis();
    return req;
  });
  
  return httpMock;
}