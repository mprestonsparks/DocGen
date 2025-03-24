/**
 * Advanced tests for document generator utility
 * Focusing on edge cases and untested paths
 */
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import * as llmUtil from '../src/utils/llm';
import * as generatorModule from '../src/utils/generator';
import { ProjectInfo, TechStack } from '../src/types';

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/output/dir')
}));

// Mock Handlebars
jest.mock('handlebars', () => ({
  compile: jest.fn(),
  registerHelper: jest.fn()
}));

// Mock LLM utility
jest.mock('../src/utils/llm', () => ({
  enhanceDocumentation: jest.fn().mockImplementation((content) => Promise.resolve(`Enhanced: ${content}`)),
  isLLMApiAvailable: jest.fn().mockReturnValue(true)
}));

describe('Generator Utility - Advanced Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mock implementation
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('Template content');
    
    // Mock the Handlebars compile function
    (Handlebars.compile as jest.Mock).mockReturnValue((data: any) => `Compiled template with data: ${JSON.stringify(data)}`);
  });

  // Sample project info and tech stack for testing
  const projectInfo: ProjectInfo = {
    id: 'PROJ-001',
    name: 'Test Project',
    description: 'A test project',
    type: 'WEB',
    created: '2025-03-05T00:00:00Z'
  };

  const techStack: TechStack = {
    recommended: ['React', 'Node.js', 'MongoDB'],
    selected: ['React', 'Node.js']
  };

  const interviewAnswers = {
    'What are the key features?': 'Authentication, dashboard, reporting',
    'Who is the target audience?': 'Business users'
  };

  describe('generateDocument function - edge cases', () => {
    test('should handle Handlebars template compilation error', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.hbs')) return true;  // Template exists
        if (path.includes('fallback')) return true; // Fallback exists
        return true; // Output directory exists
      });
      
      // Mock Handlebars compile to throw an error
      (Handlebars.compile as jest.Mock).mockImplementation(() => {
        throw new Error('Compilation error');
      });
      
      // Execute
      const result = await generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers);
      
      // Verify
      expect(result).toContain('test-project-prd.md');
      expect(fs.readFileSync).toHaveBeenCalledTimes(2); // Once for template, once for fallback
      expect(console.error).toHaveBeenCalled();
    });
    
    test('should handle missing Handlebars template but available fallback', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.hbs')) return false; // No Handlebars template
        if (path.includes('fallback')) return true; // Fallback exists
        return true; // Output directory exists
      });
      
      // Execute
      const result = await generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers);
      
      // Verify
      expect(result).toContain('test-project-prd.md');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Once for fallback
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Using fallback template'));
    });
    
    test('should handle missing both Handlebars template and fallback', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.hbs')) return false; // No Handlebars template
        if (path.includes('fallback')) return false; // No fallback
        return true; // Output directory exists
      });
      
      // Execute
      const result = await generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers);
      
      // Verify
      expect(result).toContain('test-project-prd.md');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Creating basic template'));
    });
    
    test('should create output directory if it does not exist', async () => {
      // Setup
      (path.dirname as jest.Mock).mockReturnValue('/nonexistent/dir');
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/nonexistent/dir') return false; // Output directory doesn't exist
        return true; // All other paths exist
      });
      
      // Execute
      await generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers);
      
      // Verify
      expect(fs.mkdirSync).toHaveBeenCalledWith('/nonexistent/dir', { recursive: true });
    });
    
    test('should disable LLM enhancement when specified', async () => {
      // Setup
      (llmUtil.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      
      // Execute
      await generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers, {
        enhanceWithLLM: false
      });
      
      // Verify
      expect(llmUtil.enhanceDocumentation).not.toHaveBeenCalled();
    });
    
    test('should handle errors during LLM enhancement', async () => {
      // Setup
      (llmUtil.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      (llmUtil.enhanceDocumentation as jest.Mock).mockImplementation(() => {
        throw new Error('LLM enhancement error');
      });
      
      // Execute
      const result = await generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers);
      
      // Verify
      expect(result).toContain('test-project-prd.md');
      expect(console.error).toHaveBeenCalled();
      // Should still write original content to file
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    test('should handle error thrown during document generation', async () => {
      // Setup
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write file error');
      });
      
      // Execute & Verify
      await expect(generatorModule.generateDocument('prd', projectInfo, techStack, interviewAnswers))
        .rejects.toThrow('Write file error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('generateAllDocuments function', () => {
    test('should create output directory if it does not exist', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('../../docs/generated')) return false; // Output directory doesn't exist
        return true; // All other paths exist
      });
      
      // Reset previous mocks
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      
      // Execute
      await generatorModule.generateAllDocuments(projectInfo, techStack, { prd: true }, interviewAnswers);
      
      // Verify
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
    
    test('should handle additional document types', async () => {
      // Setup
      const documentationNeeds = {
        prd: false,
        srs: false,
        sad: false,
        sdd: false,
        stp: false,
        additional: ['CUSTOM_DOC', 'ANOTHER_DOC']
      };
      
      // Reset previous mocks
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      
      // Execute
      await generatorModule.generateAllDocuments(projectInfo, techStack, documentationNeeds, interviewAnswers);
      
      // Verify
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CUSTOM_DOC'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ANOTHER_DOC'));
    });
  });
});