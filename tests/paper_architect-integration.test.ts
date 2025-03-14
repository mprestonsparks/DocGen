/**
 * Integration tests for the paper_architect module
 * 
 * These tests focus on the integration between paper_architect and the core DocGen components.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as paperArchitect from '../src/paper_architect';
import * as session from '../src/utils/session';
import * as config from '../src/utils/config';
import * as validation from '../src/utils/validation';

// Mock dependencies
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../src/utils/llm', () => ({
  isLLMApiAvailable: jest.fn().mockReturnValue(false),
  query: jest.fn()
}));

jest.mock('../src/utils/session', () => ({
  generateSessionId: jest.fn().mockReturnValue('test-session-id'),
  saveSession: jest.fn(),
  loadSession: jest.fn().mockReturnValue({
    projectInfo: {
      id: 'PAPER-1234',
      name: 'Test Paper',
      description: 'Test paper description',
      type: 'ACADEMIC_PAPER',
      created: '2023-01-01T00:00:00.000Z'
    },
    interviewAnswers: {
      'Paper Title': 'Test Paper',
      'Paper Authors': 'Author One, Author Two',
      'Paper Abstract': 'Test paper abstract',
      'Paper Year': '2023'
    },
    _lastUpdated: '2023-01-01T00:00:00.000Z'
  }),
  listSessions: jest.fn().mockReturnValue([
    {
      sessionId: 'test-session-id',
      projectName: 'Test Paper',
      lastUpdated: '2023-01-01T00:00:00.000Z'
    }
  ])
}));

// Sample test data
const samplePaperContent = {
  paperInfo: {
    title: 'Sample Paper for Integration Testing',
    authors: ['Test Author'],
    abstract: 'Abstract for testing',
    year: 2023
  },
  sections: [
    {
      id: 'sec-1',
      level: 1,
      title: 'Introduction',
      content: 'Introduction content',
      subsections: []
    }
  ],
  algorithms: [
    {
      id: 'algo-1',
      name: 'TestAlgorithm',
      description: 'Test algorithm',
      pseudocode: 'function test() { return true; }',
      inputs: ['input1'],
      outputs: ['output1'],
      sectionId: 'sec-1'
    }
  ],
  equations: [],
  figures: [],
  tables: [],
  citations: []
};

// Create tempDir for tests
const tempDir = path.join(__dirname, 'temp_test_dir');
beforeAll(() => {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create a mock paper file
  fs.writeFileSync(path.join(tempDir, 'test-paper.pdf'), 'Mock PDF content');
  
  // Mock fs functions for specific paths
  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  
  jest.spyOn(fs, 'existsSync').mockImplementation((path: string | Buffer) => {
    if (typeof path === 'string' && path.includes('paper_content.json')) {
      return true;
    }
    if (typeof path === 'string' && path.includes('knowledge_model.json')) {
      return true;
    }
    if (typeof path === 'string' && path.includes('traceability_matrix.json')) {
      return true;
    }
    if (typeof path === 'string' && path.includes('implementation_plan.md')) {
      return true;
    }
    return originalExistsSync(path);
  });
  
  jest.spyOn(fs, 'readFileSync').mockImplementation((path: any, options?: any) => {
    if (typeof path === 'string' && path.includes('paper_content.json')) {
      return JSON.stringify(samplePaperContent);
    }
    return originalReadFileSync(path, options);
  });
  
  jest.spyOn(fs, 'writeFileSync').mockImplementation((path: any, data: any, options?: any) => {
    // Don't actually write to disk in tests
    return undefined as any;
  });
});

afterAll(() => {
  // Clean up the temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Restore original functions
  jest.restoreAllMocks();
});

describe('paper_architect integration with DocGen core', () => {
  // Mocks for extraction, knowledge and other modules
  beforeEach(() => {
    jest.spyOn(paperArchitect, 'initializePaperImplementation').mockResolvedValue('test-session-id');
    jest.spyOn(paperArchitect, 'getPaperContent').mockReturnValue(samplePaperContent);
    jest.spyOn(config, 'loadDocumentDefaults').mockReturnValue({});
    jest.spyOn(validation, 'validateDocument').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
  });

  describe('session management integration', () => {
    it('should create a session when initializing paper implementation', async () => {
      await paperArchitect.initializePaperImplementation(path.join(tempDir, 'test-paper.pdf'));
      
      expect(session.generateSessionId).toHaveBeenCalled();
      expect(session.saveSession).toHaveBeenCalled();
      expect(session.saveSession).toHaveBeenCalledWith('test-session-id', expect.objectContaining({
        projectInfo: expect.objectContaining({
          type: 'ACADEMIC_PAPER'
        })
      }));
    });
    
    it('should load a session when retrieving paper content', () => {
      paperArchitect.getPaperContent('test-session-id');
      
      expect(session.loadSession).toHaveBeenCalledWith('test-session-id');
    });
  });
  
  describe('project type integration', () => {
    it('should use ACADEMIC_PAPER project type', async () => {
      await paperArchitect.initializePaperImplementation(path.join(tempDir, 'test-paper.pdf'));
      
      // Verify the session was saved with the ACADEMIC_PAPER project type
      expect(session.saveSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          projectInfo: expect.objectContaining({
            type: 'ACADEMIC_PAPER'
          })
        })
      );
    });
  });
  
  describe('validation integration', () => {
    it('should generate valid documents that pass validation', async () => {
      // Mock fs.readFileSync for generated files
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        'executable_spec.md'
      ] as any);
      
      // Mock validation
      jest.spyOn(validation, 'validateDocument').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        schemaVersion: '1.0.0'
      });
      
      // Initialize paper implementation
      await paperArchitect.initializePaperImplementation(path.join(tempDir, 'test-paper.pdf'));
      
      // Simulate validation of generated files
      const result = validation.validateDocument('docs/generated/paper/executable_spec.md');
      
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('data flow integration', () => {
    it('should pass data correctly between components', async () => {
      // Mock submodule functions to test data flow
      const extractionMock = jest.fn().mockResolvedValue(samplePaperContent);
      const knowledgeMock = jest.fn().mockResolvedValue({ concepts: [], relationships: [] });
      const specificationsMock = jest.fn().mockResolvedValue([]);
      
      // Use these mocks to track data flow
      jest.mock('../src/paper_architect/extraction', () => ({
        extractPaperContent: extractionMock
      }));
      
      jest.mock('../src/paper_architect/knowledge', () => ({
        generateKnowledgeModel: knowledgeMock
      }));
      
      jest.mock('../src/paper_architect/specifications', () => ({
        generateExecutableSpecifications: specificationsMock
      }));
      
      // Initialize paper implementation
      await paperArchitect.initializePaperImplementation(path.join(tempDir, 'test-paper.pdf'));
      
      // Test data flow through session storage
      expect(session.saveSession).toHaveBeenCalledTimes(1);
      
      // Verify paper information is saved in interview answers
      const saveSessionCall = (session.saveSession as jest.Mock).mock.calls[0];
      const interviewAnswers = saveSessionCall[1].interviewAnswers;
      
      expect(interviewAnswers).toBeDefined();
      expect(Object.keys(interviewAnswers)).toContain('Paper Title');
      expect(Object.keys(interviewAnswers)).toContain('Paper Authors');
      expect(Object.keys(interviewAnswers)).toContain('Paper Abstract');
      expect(Object.keys(interviewAnswers)).toContain('Paper Year');
    });
  });
});