/**
 * Tests for private functions in paper_architect/workflow module
 * 
 * These tests indirectly test private functions by creating specific scenarios
 * and verifying the results match what we'd expect from the private functions.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as logger from '../../../src/utils/logger';
import * as llm from '../../../src/utils/llm';
import * as workflow from '../../../src/paper_architect/workflow';
import { PaperContent, PaperKnowledgeGraph } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../src/utils/llm', () => ({
  isLLMApiAvailable: jest.fn().mockReturnValue(true),
  query: jest.fn().mockImplementation(async (prompt) => {
    return {
      content: `
\`\`\`json
{
  "title": "Implementation Plan for Test Algorithm",
  "stages": [
    {
      "id": "stage-1",
      "name": "Foundation Layer",
      "description": "Implement the core components",
      "components": [
        {
          "id": "component-1",
          "name": "TestAlgorithm",
          "description": "Implementation of the test algorithm",
          "conceptIds": ["concept-1"],
          "dependencies": [],
          "status": "notStarted"
        }
      ]
    },
    {
      "id": "stage-2",
      "name": "Validation Layer",
      "description": "Implement validation and testing",
      "components": [
        {
          "id": "component-2",
          "name": "TestAlgorithmValidator",
          "description": "Validation for the test algorithm",
          "conceptIds": ["concept-1"],
          "dependencies": ["component-1"],
          "status": "notStarted"
        }
      ]
    }
  ],
  "verificationStrategy": {
    "unitTests": [
      "Test the algorithm with valid inputs",
      "Test the algorithm with invalid inputs"
    ],
    "integrationTests": [
      "Test the algorithm with the validation component"
    ],
    "validationExperiments": [
      {
        "name": "Performance Test",
        "description": "Test algorithm performance with large inputs",
        "expectedResults": "Algorithm should complete in under 1 second"
      }
    ]
  }
}
\`\`\`
      `
    };
  })
}));

describe('paper_architect/workflow private functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample test data
  const samplePaperContent: PaperContent = {
    paperInfo: {
      title: 'Test Paper for Workflow Module',
      authors: ['Test Author'],
      abstract: 'Test paper abstract',
      year: 2023
    },
    sections: [
      {
        id: 'sec-1',
        level: 1,
        title: 'Introduction',
        content: 'This paper introduces a test algorithm',
        subsections: []
      }
    ],
    algorithms: [
      {
        id: 'algo-1',
        name: 'TestAlgorithm',
        description: 'Test algorithm description',
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

  const sampleKnowledgeGraph: PaperKnowledgeGraph = {
    concepts: [
      {
        id: 'concept-1',
        name: 'Test Algorithm',
        description: 'A test algorithm for unit testing',
        type: 'algorithm',
        sourceElements: ['algo-1']
      },
      {
        id: 'concept-2',
        name: 'Test Method',
        description: 'A test method',
        type: 'method',
        sourceElements: []
      },
      {
        id: 'concept-3',
        name: 'Test Data Structure',
        description: 'A test data structure',
        type: 'dataStructure',
        sourceElements: []
      },
      {
        id: 'concept-4',
        name: 'Test Parameter',
        description: 'A test parameter',
        type: 'parameter',
        sourceElements: []
      }
    ],
    relationships: [
      {
        id: 'rel-1',
        sourceId: 'concept-1',
        targetId: 'concept-2',
        type: 'uses',
        description: 'The algorithm uses this method'
      },
      {
        id: 'rel-2',
        sourceId: 'concept-1',
        targetId: 'concept-3',
        type: 'dependsOn',
        description: 'The algorithm depends on this data structure'
      }
    ]
  };

  describe('generatePlanWithLLM (indirectly tested)', () => {
    it('should generate a plan using LLM', async () => {
      // Test with LLM available
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      
      const result = await workflow.generateImplementationPlan(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Implementation Plan for Test Algorithm');
      expect(result.stages).toHaveLength(2);
      expect(result.verificationStrategy).toBeDefined();
      
      // Verify LLM was called with appropriate prompt
      expect(llm.query).toHaveBeenCalled();
      const promptArg = (llm.query as jest.Mock).mock.calls[0][0];
      expect(promptArg).toContain(samplePaperContent.paperInfo.title);
      expect(promptArg).toContain('javascript'); // Implementation language
    });
    
    it('should handle LLM errors gracefully', async () => {
      // Mock LLM to throw an error
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      (llm.query as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      const result = await workflow.generateImplementationPlan(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      // Should still return a plan despite LLM error (fallback plan)
      expect(result).toBeDefined();
      expect(result.stages).toBeDefined();
      
      // Error should be logged
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should handle invalid JSON response from LLM', async () => {
      // Mock LLM to return invalid JSON
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      (llm.query as jest.Mock).mockResolvedValueOnce({
        content: 'This is not valid JSON'
      });
      
      const result = await workflow.generateImplementationPlan(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      // Should still return a plan despite parsing error (fallback plan)
      expect(result).toBeDefined();
      expect(result.stages).toBeDefined();
      
      // Error should be logged
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('generateBasicImplementationPlan (indirectly tested)', () => {
    it('should generate a basic plan without LLM', async () => {
      // Set LLM as unavailable to force using the basic plan
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(false);
      
      const result = await workflow.generateImplementationPlan(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toContain(samplePaperContent.paperInfo.title);
      expect(result.stages).toBeDefined();
      expect(result.stages.length).toBeGreaterThan(0);
      expect(result.verificationStrategy).toBeDefined();
      
      // LLM should not be called
      expect(llm.query).not.toHaveBeenCalled();
      
      // The basic plan should contain stages
      expect(result.stages.length).toBeGreaterThan(0);
      
      // Should have a title with the paper title
      expect(result.title).toContain(samplePaperContent.paperInfo.title);
    });
    
    it('should handle errors gracefully', async () => {
      // Set LLM as unavailable to force using the basic plan
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(false);
      
      // Create a broken knowledge graph to trigger an error
      const brokenGraph = {
        concepts: null as any,
        relationships: null as any
      };
      
      const result = await workflow.generateImplementationPlan(
        samplePaperContent,
        brokenGraph,
        'javascript'
      );
      
      // Should return a minimal plan on error
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.stages).toBeDefined();
      
      // Error should be logged
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getConceptDependencies (indirectly tested)', () => {
    it('should correctly handle dependencies between concepts', async () => {
      // Set LLM as unavailable to force using the basic plan, which uses getConceptDependencies
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(false);
      
      const result = await workflow.generateImplementationPlan(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      // The plan should have been created successfully
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.stages).toBeDefined();
      expect(result.stages.length).toBeGreaterThan(0);
      
      // Check verification strategy exists
      expect(result.verificationStrategy).toBeDefined();
    });
  });

  describe('createPaperSummary (indirectly tested)', () => {
    it('should include algorithm information in the LLM prompt', async () => {
      // Ensure LLM is available
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      
      await workflow.generateImplementationPlan(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      // Check that the LLM was called with a prompt containing algorithm info
      const promptArg = (llm.query as jest.Mock).mock.calls[0][0];
      expect(promptArg).toContain('TestAlgorithm');
      expect(promptArg).toContain('Test algorithm description');
    });
    
    it('should include equations in the LLM prompt if present', async () => {
      // Ensure LLM is available
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValue(true);
      
      // Create sample paper content with equations
      const paperWithEquations = {
        ...samplePaperContent,
        equations: [
          {
            id: 'eq-1',
            content: 'y = mx + b',
            description: 'Linear equation',
            sectionId: 'sec-1'
          }
        ]
      };
      
      await workflow.generateImplementationPlan(
        paperWithEquations,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      // Check that the LLM was called with a prompt mentioning equations
      const promptArg = (llm.query as jest.Mock).mock.calls[0][0];
      expect(promptArg).toContain('equation');
    });
  });

  describe('formatStatus (indirectly tested)', () => {
    it('should format status in the markdown output', () => {
      // Create a test plan with various statuses
      const testPlan = {
        id: 'test-plan',
        title: 'Test Status Formatting',
        stages: [
          {
            id: 'stage-1',
            name: 'Test Stage',
            description: 'Test description',
            components: [
              {
                id: 'comp-1',
                name: 'Not Started Component',
                description: 'This component has not started',
                conceptIds: [],
                dependencies: [],
                status: 'notStarted'
              },
              {
                id: 'comp-2',
                name: 'In Progress Component',
                description: 'This component is in progress',
                conceptIds: [],
                dependencies: [],
                status: 'inProgress'
              },
              {
                id: 'comp-3',
                name: 'Implemented Component',
                description: 'This component is implemented',
                conceptIds: [],
                dependencies: [],
                status: 'implemented'
              },
              {
                id: 'comp-4',
                name: 'Verified Component',
                description: 'This component is verified',
                conceptIds: [],
                dependencies: [],
                status: 'verified'
              },
              {
                id: 'comp-5',
                name: 'Unknown Status Component',
                description: 'This component has unknown status',
                conceptIds: [],
                dependencies: [],
                status: 'unknown'
              }
            ]
          }
        ],
        verificationStrategy: {
          unitTests: [],
          integrationTests: [],
          validationExperiments: []
        }
      };
      
      const markdown = workflow.formatImplementationPlan(testPlan);
      
      // Verify the markdown contains formatted statuses
      expect(markdown).toContain('⬜ Not Started');
      expect(markdown).toContain('🟡 In Progress');
      expect(markdown).toContain('🟢 Implemented');
      expect(markdown).toContain('✅ Verified');
      expect(markdown).toContain('unknown'); // Unknown status should be returned as-is
    });
  });
});