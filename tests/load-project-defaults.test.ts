/**
 * Tests for loadProjectDefaults function in src/index.ts
 */

// Mock project-analyzer to avoid issues with logger.getLogger 
jest.mock('../src/utils/project-analyzer', () => 
  require('./mocks/project-analyzer.mock.js')
);

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock path first
jest.mock('path', () => ({
  join: jest.fn(),
  resolve: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn()
}));

// Mock commander to prevent it from parsing arguments
jest.mock('commander', () => ({
  program: {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn(), // Mock parse to do nothing
    outputHelp: jest.fn()
  }
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

// Mock yaml
jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

// Mock logger with direct mock functions so we can spy on them
const mockLoggerError = jest.fn();
jest.mock('../src/utils/logger', () => ({
  error: mockLoggerError,
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

// Mock config utils
jest.mock('../src/utils/config', () => ({
  getOutputDir: jest.fn(),
  getTemplateDir: jest.fn(),
  ensureDirectoriesExist: jest.fn(),
  isAIEnhancementEnabled: jest.fn(),
  getLogFilePath: jest.fn(),
  getLogLevel: jest.fn()
}));

// Now it's safe to import
import { loadProjectDefaults } from '../src/index';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

describe('loadProjectDefaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockReturnValue('/mock/path/config/project-defaults.yaml');
  });

  it('should load project defaults from file when available', () => {
    // Setup mocks
    const mockConfig = {
      schema_versions: { prd: '1.1.0' },
      document_versions: { prd: '1.0.0' },
      document_statuses: ['DRAFT'],
      project_types: { WEB: { recommended_docs: ['prd'] } }
    };
    
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
    (yaml.load as jest.Mock).mockReturnValue(mockConfig);

    // Execute
    const result = loadProjectDefaults();

    // Verify
    expect(fs.existsSync).toHaveBeenCalledWith('/mock/path/config/project-defaults.yaml');
    expect(fs.readFileSync).toHaveBeenCalledWith('/mock/path/config/project-defaults.yaml', 'utf8');
    expect(yaml.load).toHaveBeenCalledWith('yaml content');
    expect(result).toEqual(mockConfig);
  });

  it('should return default values when config file does not exist', () => {
    // Setup mocks
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Execute
    const result = loadProjectDefaults();

    // Verify
    expect(fs.existsSync).toHaveBeenCalledWith('/mock/path/config/project-defaults.yaml');
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(yaml.load).not.toHaveBeenCalled();
    
    // Check default values
    expect(result).toHaveProperty('schema_versions');
    expect(result).toHaveProperty('document_versions');
    expect(result).toHaveProperty('document_statuses');
    expect(result).toHaveProperty('project_types');
  });

  it('should handle errors and return default values', () => {
    // Setup mocks to throw an error
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File read error');
    });

    // Execute
    const result = loadProjectDefaults();

    // Verify error was logged
    expect(mockLoggerError).toHaveBeenCalled();
    
    // Check default values were returned
    expect(result).toHaveProperty('schema_versions');
    expect(result).toHaveProperty('document_versions');
    expect(result).toHaveProperty('document_statuses');
    expect(result).toHaveProperty('project_types');
  });
});