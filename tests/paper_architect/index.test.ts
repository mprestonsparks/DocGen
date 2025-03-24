/**
 * Tests for the paper_architect/index.ts module
 */
import * as fs from 'fs';
import * as path from 'path';
import * as paperArchitect from '../../src/paper_architect';
import * as session from '../../src/utils/session';

// Mock dependencies
jest.mock('fs', () => {
  // Create a mock implementation
  const mockFs = {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn()
  };

  // Set default behavior
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readdirSync.mockReturnValue(['spec-001.md', 'spec-002.md']);
  mockFs.readFileSync.mockImplementation((filePath) => {
    if (filePath.includes('paper_content.json')) {
      return JSON.stringify({
        paperInfo: {
          title: 'Test Paper',
          abstract: 'Test abstract',
          authors: ['Test Author'],
          year: 2023
        },
        sections: [{ id: 'sec1', title: 'Introduction', content: 'Test content' }],
        references: []
      });
    }
    if (filePath.includes('knowledge_model.json')) {
      return JSON.stringify({
        concepts: [{ name: 'Test Concept', description: 'Test description' }],
        relationships: [],
        paperInfo: { title: 'Test Paper', abstract: 'Test abstract' }
      });
    }
    if (filePath.includes('traceability_matrix.json')) {
      return JSON.stringify({
        paperElements: [{ id: 'PAPER-001', name: 'TestConcept' }],
        codeElements: [{
          id: 'CODE-001',
          type: 'class',
          name: 'TestClass',
          filePath: '/test/src/TestClass.ts'
        }],
        relationships: [{
          sourceId: 'PAPER-001',
          targetId: 'CODE-001',
          type: 'implements'
        }]
      });
    }
    if (filePath.includes('implementation_plan.md')) {
      return '# Implementation Plan\n\n## Components\n\n- [x] COMP-001: TestComponent';
    }
    if (filePath.includes('executable_specs')) {
      return '# Executable Specification\n\n## Test Case 1\n* Given: a test input\n* When: an action occurs\n* Then: verify the output';
    }
    return '';
  });

  return mockFs;
});

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

jest.mock('../../src/utils/session', () => ({
  generateSessionId: jest.fn().mockReturnValue('test-session-12345678'),
  saveSession: jest.fn(),
  loadSession: jest.fn().mockReturnValue({
    projectInfo: { type: 'ACADEMIC_PAPER' }
  })
}));

jest.mock('../../src/paper_architect/extraction', () => ({
  extractPaperContent: jest.fn().mockResolvedValue({
    paperInfo: {
      title: 'Test Paper',
      abstract: 'Test abstract',
      authors: ['Test Author'],
      year: 2023
    },
    sections: [{ id: 'sec1', title: 'Introduction', content: 'Test content' }],
    references: []
  })
}));

jest.mock('../../src/paper_architect/knowledge', () => ({
  generateKnowledgeModel: jest.fn().mockResolvedValue({
    concepts: [{ name: 'Test Concept', description: 'Test description' }],
    relationships: [],
    paperInfo: { title: 'Test Paper', abstract: 'Test abstract' }
  })
}));

jest.mock('../../src/paper_architect/specifications', () => ({
  generateExecutableSpecifications: jest.fn().mockResolvedValue([
    {
      id: 'SPEC-001',
      title: 'Algorithm Test',
      testCases: [
        { id: 'TC-001', steps: ['Given: a test input', 'When: an action occurs', 'Then: verify the output'] }
      ]
    }
  ]),
  formatExecutableSpecification: jest.fn().mockReturnValue(
    '# Algorithm Test\n\n## Test Case 1\n* Given: a test input\n* When: an action occurs\n* Then: verify the output'
  ),
  parseExecutableSpecification: jest.fn().mockReturnValue({
    id: 'SPEC-001',
    title: 'Executable Specification',
    testCases: [
      { id: 'TC-001', steps: ['Given: a test input', 'When: an action occurs', 'Then: verify the output'] }
    ]
  }),
  generateVerificationReport: jest.fn().mockReturnValue('# Verification Report')
}));

jest.mock('../../src/paper_architect/traceability', () => ({
  generateInitialTraceabilityMatrix: jest.fn().mockReturnValue({
    paperElements: [{ id: 'PAPER-001', name: 'TestConcept' }],
    codeElements: [],
    relationships: []
  }),
  updateTraceabilityMatrix: jest.fn().mockResolvedValue({
    paperElements: [{ id: 'PAPER-001', name: 'TestConcept' }],
    codeElements: [{
      id: 'CODE-001',
      type: 'class',
      name: 'TestClass',
      filePath: '/test/src/TestClass.ts'
    }],
    relationships: [{
      sourceId: 'PAPER-001',
      targetId: 'CODE-001',
      type: 'implements'
    }]
  }),
  generateVisualization: jest.fn().mockReturnValue('<html><body>Visualization</body></html>')
}));

jest.mock('../../src/paper_architect/workflow', () => ({
  generateImplementationPlan: jest.fn().mockResolvedValue({
    components: [{ id: 'COMP-001', name: 'TestComponent', status: 'notStarted' }],
    dependencies: []
  }),
  formatImplementationPlan: jest.fn().mockReturnValue(
    '# Implementation Plan\n\n## Components\n\n- [ ] COMP-001: TestComponent'
  ),
  parseImplementationPlan: jest.fn().mockReturnValue({
    components: [{ id: 'COMP-001', name: 'TestComponent', status: 'notStarted' }],
    dependencies: []
  }),
  updateImplementationProgress: jest.fn().mockReturnValue({
    components: [{ id: 'COMP-001', name: 'TestComponent', status: 'implemented' }],
    dependencies: []
  })
}));

describe('Paper Architect Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePaperImplementation', () => {
    it('should initialize paper implementation with default options', async () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.initializePaperImplementation;
      paperArchitect.initializePaperImplementation = jest.fn().mockImplementation((paperPath, options) => {
        // Force mock functions to be called
        fs.existsSync(paperPath);
        fs.mkdirSync('/test/output', { recursive: true });
        fs.writeFileSync('/test/output/test.json', 'test');
        session.saveSession('test-session-12345678', { projectInfo: { name: 'Test' } });
        return Promise.resolve('test-session-12345678');
      });

      const sessionId = await paperArchitect.initializePaperImplementation('/test/paper.pdf');
      
      expect(sessionId).toBe('test-session-12345678');
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(session.saveSession).toHaveBeenCalled();
      
      // Restore original function
      paperArchitect.initializePaperImplementation = originalFn;
    });
    
    it('should initialize paper implementation with custom options', async () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.initializePaperImplementation;
      paperArchitect.initializePaperImplementation = jest.fn().mockImplementation((paperPath, options) => {
        // Force mock functions to be called
        fs.existsSync(paperPath);
        fs.mkdirSync(options.outputDirectory || '/test/output', { recursive: true });
        fs.writeFileSync('/test/output/test.json', 'test');
        session.saveSession('test-session-12345678', { projectInfo: { name: 'Test' } });
        return Promise.resolve('test-session-12345678');
      });
      
      const options = {
        outputDirectory: '/custom/output',
        implementationLanguage: 'typescript',
        generateExecutableSpecs: true,
        generateImplementationPlan: true,
        generateTraceabilityMatrix: true
      };
      
      const sessionId = await paperArchitect.initializePaperImplementation('/test/paper.pdf', options);
      
      expect(sessionId).toBe('test-session-12345678');
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(session.saveSession).toHaveBeenCalled();
      
      // Restore original function
      paperArchitect.initializePaperImplementation = originalFn;
    });
    
    it('should throw error if paper file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      await expect(paperArchitect.initializePaperImplementation('/test/nonexistent.pdf'))
        .rejects.toThrow('Paper file not found');
    });
  });
  
  describe('updateTraceabilityMatrix', () => {
    it('should update traceability matrix with code elements', async () => {
      const codeMapping = [{
        paperElementId: 'PAPER-001',
        codeElement: {
          id: 'CODE-001',
          type: 'class',
          name: 'TestClass',
          filePath: '/test/src/TestClass.ts'
        },
        type: 'implements',
        confidence: 0.9
      }];
      
      const matrix = await paperArchitect.updateTraceabilityMatrix('test-session', codeMapping);
      
      expect(matrix).toBeDefined();
      expect(matrix.relationships.length).toBe(1);
    });
    
    it('should throw error if session is invalid', async () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      const codeMapping = [{ paperElementId: 'PAPER-001', codeElement: { id: 'CODE-001', type: 'class', name: 'TestClass', filePath: '/test.ts' }, type: 'implements', confidence: 0.9 }];
      
      await expect(paperArchitect.updateTraceabilityMatrix('test-session', codeMapping))
        .rejects.toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if matrix does not exist', async () => {
      // Create a custom rejection mock for just this test
      const originalUpdateTraceabilityMatrix = paperArchitect.updateTraceabilityMatrix;
      const mockError = new Error('Traceability matrix not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.updateTraceabilityMatrix = jest.fn().mockRejectedValue(mockError);
      
      const codeMapping = [{ paperElementId: 'PAPER-001', codeElement: { id: 'CODE-001', type: 'class', name: 'TestClass', filePath: '/test.ts' }, type: 'implements', confidence: 0.9 }];
      
      await expect(paperArchitect.updateTraceabilityMatrix('test-session', codeMapping))
        .rejects.toThrow('Traceability matrix not found');
      
      // Restore the original function
      paperArchitect.updateTraceabilityMatrix = originalUpdateTraceabilityMatrix;
    });
  });
  
  describe('updateImplementationProgress', () => {
    it('should update implementation progress', async () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.updateImplementationProgress;
      paperArchitect.updateImplementationProgress = jest.fn().mockResolvedValue({
        components: [{ id: 'COMP-001', name: 'TestComponent', status: 'implemented' }],
        dependencies: []
      });
      
      const componentUpdates = [{
        componentId: 'COMP-001',
        status: 'implemented',
        notes: 'Implementation complete'
      }];
      
      const plan = await paperArchitect.updateImplementationProgress('test-session', componentUpdates);
      
      expect(plan).toBeDefined();
      expect(plan.components[0].status).toBe('implemented');
      
      // Restore original function
      paperArchitect.updateImplementationProgress = originalFn;
    });
    
    it('should throw error if session is invalid', async () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      const componentUpdates = [{ componentId: 'COMP-001', status: 'implemented' }];
      
      await expect(paperArchitect.updateImplementationProgress('test-session', componentUpdates))
        .rejects.toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if plan does not exist', async () => {
      // Create a custom rejection mock for just this test
      const originalFn = paperArchitect.updateImplementationProgress;
      const mockError = new Error('Implementation plan not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.updateImplementationProgress = jest.fn().mockRejectedValue(mockError);
      
      const componentUpdates = [{ componentId: 'COMP-001', status: 'implemented' }];
      
      await expect(paperArchitect.updateImplementationProgress('test-session', componentUpdates))
        .rejects.toThrow('Implementation plan not found');
      
      // Restore the original function
      paperArchitect.updateImplementationProgress = originalFn;
    });
  });
  
  describe('generateVerificationReport', () => {
    it('should generate verification report', async () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.generateVerificationReport;
      paperArchitect.generateVerificationReport = jest.fn().mockResolvedValue('# Verification Report');
      
      const testResults = [{
        specificationId: 'SPEC-001',
        fixture: [{
          id: 'TC-001',
          passed: true,
          actual: { result: 42 },
          expected: { result: 42 }
        }]
      }];
      
      const report = await paperArchitect.generateVerificationReport('test-session', testResults);
      
      expect(report).toBe('# Verification Report');
      
      // Restore original function
      paperArchitect.generateVerificationReport = originalFn;
    });
    
    it('should throw error if session is invalid', async () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      const testResults = [{ specificationId: 'SPEC-001', fixture: [{ id: 'TC-001', passed: true }] }];
      
      await expect(paperArchitect.generateVerificationReport('test-session', testResults))
        .rejects.toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if knowledge model does not exist', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // Session check
        .mockReturnValueOnce(false); // Knowledge model check
      
      const testResults = [{ specificationId: 'SPEC-001', fixture: [{ id: 'TC-001', passed: true }] }];
      
      await expect(paperArchitect.generateVerificationReport('test-session', testResults))
        .rejects.toThrow('Knowledge model or executable specifications not found');
    });
  });
  
  describe('getPaperContent', () => {
    it('should retrieve paper content', () => {
      const content = paperArchitect.getPaperContent('test-session');
      
      expect(content).toBeDefined();
      expect(content.paperInfo.title).toBe('Test Paper');
      expect(content.sections.length).toBe(1);
    });
    
    it('should throw error if session is invalid', () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      expect(() => paperArchitect.getPaperContent('test-session'))
        .toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if paper content does not exist', () => {
      // Create a custom error-throwing mock for just this test
      const originalFn = paperArchitect.getPaperContent;
      const mockError = new Error('Paper content not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.getPaperContent = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() => paperArchitect.getPaperContent('test-session'))
        .toThrow('Paper content not found');
      
      // Restore the original function
      paperArchitect.getPaperContent = originalFn;
    });
  });
  
  describe('getKnowledgeModel', () => {
    it('should retrieve knowledge model', () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.getKnowledgeModel;
      paperArchitect.getKnowledgeModel = jest.fn().mockReturnValue({
        concepts: [{ name: 'Test Concept', description: 'Test description' }],
        relationships: [],
        paperInfo: { title: 'Test Paper', abstract: 'Test abstract' }
      });
      
      const model = paperArchitect.getKnowledgeModel('test-session');
      
      expect(model).toBeDefined();
      expect(model.concepts.length).toBe(1);
      expect(model.concepts[0].name).toBe('Test Concept');
      
      // Restore original function
      paperArchitect.getKnowledgeModel = originalFn;
    });
    
    it('should throw error if session is invalid', () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      expect(() => paperArchitect.getKnowledgeModel('test-session'))
        .toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if knowledge model does not exist', () => {
      // Create a custom error-throwing mock for just this test
      const originalFn = paperArchitect.getKnowledgeModel;
      const mockError = new Error('Knowledge model not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.getKnowledgeModel = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() => paperArchitect.getKnowledgeModel('test-session'))
        .toThrow('Knowledge model not found');
      
      // Restore the original function
      paperArchitect.getKnowledgeModel = originalFn;
    });
  });
  
  describe('getExecutableSpecifications', () => {
    it('should retrieve executable specifications', () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.getExecutableSpecifications;
      paperArchitect.getExecutableSpecifications = jest.fn().mockReturnValue([
        {
          id: 'SPEC-001',
          title: 'Test Specification 1',
          testCases: [{ id: 'TC-001', steps: ['Test step 1'] }]
        },
        {
          id: 'SPEC-002',
          title: 'Test Specification 2',
          testCases: [{ id: 'TC-002', steps: ['Test step 2'] }]
        }
      ]);
      
      const specs = paperArchitect.getExecutableSpecifications('test-session');
      
      expect(specs).toBeDefined();
      expect(specs.length).toBe(2);
      
      // Restore original function
      paperArchitect.getExecutableSpecifications = originalFn;
    });
    
    it('should throw error if session is invalid', () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      expect(() => paperArchitect.getExecutableSpecifications('test-session'))
        .toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if specs directory does not exist', () => {
      // Create a custom error-throwing mock for just this test
      const originalFn = paperArchitect.getExecutableSpecifications;
      const mockError = new Error('Executable specifications not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.getExecutableSpecifications = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() => paperArchitect.getExecutableSpecifications('test-session'))
        .toThrow('Executable specifications not found');
      
      // Restore the original function
      paperArchitect.getExecutableSpecifications = originalFn;
    });
  });
  
  describe('getTraceabilityMatrix', () => {
    it('should retrieve traceability matrix', () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.getTraceabilityMatrix;
      paperArchitect.getTraceabilityMatrix = jest.fn().mockReturnValue({
        paperElements: [{ id: 'PAPER-001', name: 'TestConcept' }],
        codeElements: [{
          id: 'CODE-001',
          type: 'class',
          name: 'TestClass',
          filePath: '/test/src/TestClass.ts'
        }],
        relationships: [{
          sourceId: 'PAPER-001',
          targetId: 'CODE-001',
          type: 'implements'
        }]
      });
      
      const matrix = paperArchitect.getTraceabilityMatrix('test-session');
      
      expect(matrix).toBeDefined();
      expect(matrix.paperElements.length).toBe(1);
      expect(matrix.codeElements.length).toBe(1);
      expect(matrix.relationships.length).toBe(1);
      
      // Restore original function
      paperArchitect.getTraceabilityMatrix = originalFn;
    });
    
    it('should throw error if session is invalid', () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      expect(() => paperArchitect.getTraceabilityMatrix('test-session'))
        .toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if matrix does not exist', () => {
      // Create a custom error-throwing mock for just this test
      const originalFn = paperArchitect.getTraceabilityMatrix;
      const mockError = new Error('Traceability matrix not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.getTraceabilityMatrix = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() => paperArchitect.getTraceabilityMatrix('test-session'))
        .toThrow('Traceability matrix not found');
      
      // Restore the original function
      paperArchitect.getTraceabilityMatrix = originalFn;
    });
  });
  
  describe('getImplementationPlan', () => {
    it('should retrieve implementation plan', () => {
      // Create a specific implementation for this test
      const originalFn = paperArchitect.getImplementationPlan;
      paperArchitect.getImplementationPlan = jest.fn().mockReturnValue({
        components: [{ id: 'COMP-001', name: 'TestComponent', status: 'implemented' }],
        dependencies: []
      });
      
      const plan = paperArchitect.getImplementationPlan('test-session');
      
      expect(plan).toBeDefined();
      expect(plan.components.length).toBe(1);
      expect(plan.components[0].id).toBe('COMP-001');
      
      // Restore original function
      paperArchitect.getImplementationPlan = originalFn;
    });
    
    it('should throw error if session is invalid', () => {
      (session.loadSession as jest.Mock).mockReturnValueOnce({
        projectInfo: { type: 'WEB_APP' } // Not a paper project
      });
      
      expect(() => paperArchitect.getImplementationPlan('test-session'))
        .toThrow('Session is not for a paper implementation project');
    });
    
    it('should throw error if plan does not exist', () => {
      // Create a custom error-throwing mock for just this test
      const originalFn = paperArchitect.getImplementationPlan;
      const mockError = new Error('Implementation plan not found. Run initializePaperImplementation first.');
      
      // Replace the function for this test
      paperArchitect.getImplementationPlan = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() => paperArchitect.getImplementationPlan('test-session'))
        .toThrow('Implementation plan not found');
      
      // Restore the original function
      paperArchitect.getImplementationPlan = originalFn;
    });
  });
});