/**
 * File system mock implementation for extraction tests
 */

import { jest } from '@jest/globals';

export interface FileSystemMock {
  existsSync: jest.Mock;
  readFileSync: jest.Mock;
  createReadStream: jest.Mock;
  writeFileSync: jest.Mock;
  unlinkSync: jest.Mock;
  statSync: jest.Mock;
  mkdirSync: jest.Mock;
}

/**
 * Creates a mock implementation of the file system
 * with reasonable defaults that can be customized per test
 */
export function createFsMock(customizations = {}): FileSystemMock {
  const defaultMock = {
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue('Mock file content'),
    createReadStream: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function(event, handler) {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return this;
      })
    }),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    statSync: jest.fn().mockReturnValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date()
    }),
    mkdirSync: jest.fn()
  };

  // Apply any customizations
  return {
    ...defaultMock,
    ...customizations
  };
}

/**
 * Sets up common file system scenarios 
 */
export function setupFileScenario(fsMock: FileSystemMock, scenario: 'success' | 'missing' | 'permission-error' | 'corrupt') {
  // Reset all mocks first
  Object.values(fsMock).forEach(mock => mock.mockReset());
  
  // Setup based on scenario
  switch (scenario) {
    case 'missing':
      fsMock.existsSync.mockReturnValue(false);
      fsMock.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      break;
    
    case 'permission-error':
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      break;
    
    case 'corrupt':
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('Corrupt content that cannot be parsed');
      break;
    
    case 'success':
    default:
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('Mock file content');
      break;
  }
  
  return fsMock;
}