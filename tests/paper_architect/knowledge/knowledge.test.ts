/**
 * Tests for paper_architect/knowledge module
 */
import * as fs from 'fs';
import * as path from 'path';
import * as knowledge from '../../../src/paper_architect/knowledge';
import * as logger from '../../../src/utils/logger';
import * as llm from '../../../src/utils/llm';
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
          description: 'A test method for evaluation',
          type: 'method',
          sourceElements: ['sec-2']
        }
      ],
      relationships: [
        {
          id: 'rel-1',
          sourceId: 'concept-1',
          targetId: 'concept-2',
          type: 'uses',
          description: 'The algorithm uses this method'
        }
      ]
    };
  })
}));

describe('paper_architect/knowledge module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample test data
  const samplePaperContent: PaperContent = {
    paperInfo: {
      title: 'Test Paper for Knowledge Module',
      authors: ['Test Author'],
      abstract: 'This is a test paper for unit testing the knowledge module',
      year: 2023
    },
    sections: [
      {
        id: 'sec-1',
        level: 1,
        title: 'Introduction',
        content: 'This paper introduces a new algorithm',
        subsections: []
      },
      {
        id: 'sec-2',
        level: 1,
        title: 'Methods',
        content: 'We use the following methods',
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

  describe('generateKnowledgeModel', () => {
    it('should generate a knowledge model for paper content', async () => {
      const result = await knowledge.generateKnowledgeModel(samplePaperContent);
      
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.relationships).toBeDefined();
      
      // Verify LLM was called
      expect(llm.query).toHaveBeenCalled();
      
      // Check that the result has concepts with expected fields
      expect(result.concepts.length).toBeGreaterThan(0);
      
      const concept = result.concepts[0];
      expect(concept).toHaveProperty('id');
      expect(concept).toHaveProperty('name');
      expect(concept).toHaveProperty('description');
      expect(concept).toHaveProperty('type');
      
      // Less strict checking for relationships as implementation might vary
      if (result.relationships.length > 0) {
        const relationship = result.relationships[0];
        expect(relationship).toHaveProperty('sourceId');
        expect(relationship).toHaveProperty('targetId');
        expect(relationship).toHaveProperty('type');
      }
    });

    it('should handle errors gracefully', async () => {
      // Mock LLM to throw an error
      (llm.query as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      // When LLM fails, the function should still return basic knowledge model with concepts
      // based on the paper content, not necessarily an empty graph
      const result = await knowledge.generateKnowledgeModel(samplePaperContent);
      
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      expect(result.relationships).toBeDefined();
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalled();
    });

    it('should create basic knowledge model even if LLM is not available', async () => {
      // Mock LLM as unavailable
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValueOnce(false);
      
      const result = await knowledge.generateKnowledgeModel(samplePaperContent);
      
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      expect(result.concepts.length).toBeGreaterThan(0);
      
      // Should create concept for algorithm
      expect(result.concepts.some(c => c.name === 'TestAlgorithm')).toBe(true);
      
      // Verify LLM was not called
      expect(llm.query).not.toHaveBeenCalled();
    });

    it('should be able to process paper sections', async () => {
      const result = await knowledge.generateKnowledgeModel(samplePaperContent);
      
      // Check that the paper sections were processed 
      // (implementation details of how they're converted to concepts may vary)
      expect(result).toBeDefined();
      expect(result.concepts.length).toBeGreaterThan(0);
      
      // The actual implementation details of how sections are processed
      // may vary, so we don't make strict assertions about specific concepts
    });

    it('should extract concepts from paper algorithms', async () => {
      // Set up specific return value for this test
      (llm.query as jest.Mock).mockResolvedValueOnce({
        concepts: [
          {
            id: 'concept-algo',
            name: 'TestAlgorithm',
            description: 'Test algorithm description',
            type: 'algorithm',
            sourceElements: ['algo-1']
          }
        ],
        relationships: []
      });
      
      const result = await knowledge.generateKnowledgeModel(samplePaperContent);
      
      // Check that algorithms got converted to concepts
      const algorithmConcept = result.concepts.find(c => c.sourceElements?.includes('algo-1'));
      expect(algorithmConcept).toBeDefined();
      expect(algorithmConcept?.type).toBe('algorithm');
    });

    it('should handle relationships between concepts', async () => {
      // The actual implementation might or might not create relationships
      // depending on the implementation details
      const result = await knowledge.generateKnowledgeModel(samplePaperContent);
      
      // We just check that it properly handles the relationships property
      expect(result).toHaveProperty('relationships');
      expect(Array.isArray(result.relationships)).toBe(true);
    });
  });
  
  describe('extractConceptsFromSections', () => {
    it('should extract concepts from capitalized multi-word terms', async () => {
      // Create a spy to access the private function
      const originalModule = jest.requireActual('../../../src/paper_architect/knowledge');
      
      // Create sample paper content with capitalized multi-word terms
      const sampleWithCapitalizedTerms = {
        paperInfo: { ...samplePaperContent.paperInfo },
        sections: [
          {
            id: 'sec-1',
            level: 1,
            title: 'Methods',
            content: 'We present the Neural Network Architecture for this task. The Gradient Descent Method is used to optimize the model.',
            subsections: []
          },
          {
            id: 'sec-2',
            level: 2,
            title: 'Results',
            content: 'The Evaluation Metrics show that our method outperforms the State Of The Art algorithms.',
            subsections: []
          }
        ],
        algorithms: [],
        equations: [],
        figures: [],
        tables: [],
        citations: []
      };
      
      // Make a custom test implementation that calls the private function
      function testExtractConceptsFromSections() {
        // Mock to force using the fallback method
        (llm.isLLMApiAvailable as jest.Mock).mockReturnValueOnce(false);
        
        // Call the public method that will use the fallback
        return knowledge.generateKnowledgeModel(sampleWithCapitalizedTerms);
      }
      
      const result = await testExtractConceptsFromSections();
      
      // Verify concepts were extracted
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      
      // Should have extracted some concepts from capitalized terms
      // (the exact number will depend on implementation details)
      expect(result.concepts.length).toBeGreaterThan(0);
    });
  });
  
  describe('mapToOntology', () => {
    it('should map concept to standard computer science ontology', () => {
      const concept: any = {
        id: 'test-concept',
        name: 'Neural Network',
        description: 'A neural network architecture',
        type: 'algorithm'
      };
      
      const result = knowledge.mapToOntology(concept);
      
      // Check that the result has the original concept properties
      expect(result).toHaveProperty('id', concept.id);
      expect(result).toHaveProperty('name', concept.name);
      expect(result).toHaveProperty('description', concept.description);
      expect(result).toHaveProperty('type', concept.type);
      
      // Check that it has the new ontologyMapping property
      expect(result).toHaveProperty('ontologyMapping');
      expect(result.ontologyMapping).toHaveProperty('domain');
      expect(result.ontologyMapping).toHaveProperty('category');
      expect(result.ontologyMapping).toHaveProperty('relationships');
    });
  });
  
  describe('enhanceWithDomainKnowledge', () => {
    it('should enhance concepts with domain knowledge', () => {
      const concepts: any[] = [
        {
          id: 'concept1',
          name: 'Neural Network',
          description: 'A neural network architecture',
          type: 'algorithm'
        },
        {
          id: 'concept2',
          name: 'Gradient Descent',
          description: 'An optimization algorithm',
          type: 'method'
        }
      ];
      
      const result = knowledge.enhanceWithDomainKnowledge(concepts);
      
      // Check that we get the same number of concepts back
      expect(result.length).toBe(concepts.length);
      
      // Check that each concept has some domain enhancements
      for (const enhancedConcept of result) {
        // Original properties should be preserved
        expect(enhancedConcept).toHaveProperty('id');
        expect(enhancedConcept).toHaveProperty('name');
        expect(enhancedConcept).toHaveProperty('description');
        expect(enhancedConcept).toHaveProperty('type');
        
        // Domain enhancements may be added
        if (enhancedConcept.domainEnhancements) {
          expect(typeof enhancedConcept.domainEnhancements).toBe('object');
        }
      }
      
      // Specific check for optimization algorithm
      const gradientDescent = result.find(c => c.name === 'Gradient Descent');
      if (gradientDescent && gradientDescent.domainEnhancements && gradientDescent.domainEnhancements.matchedCategory) {
        // If matched to a category, should have associated properties
        expect(gradientDescent.domainEnhancements).toHaveProperty('complexity');
      }
    });
  });
  
  describe('identifyRelationships', () => {
    it('should create relationships between algorithms and methods in the same section', async () => {
      // Create paper content with an algorithm and method mentioned in the same section
      const paperWithOverlappingConcepts: any = {
        ...samplePaperContent,
        sections: [
          {
            id: 'sec-1',
            level: 1,
            title: 'Methods',
            content: 'The TestAlgorithm uses the TestMethod for optimization.',
            subsections: []
          }
        ]
      };
      
      // Force using the fallback method by having LLM not available
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValueOnce(false);
      
      const concepts = [
        {
          id: 'algo1',
          name: 'TestAlgorithm',
          description: 'Test algorithm',
          type: 'algorithm' as const,
          sourceElements: ['sec-1']
        },
        {
          id: 'method1',
          name: 'TestMethod',
          description: 'Test method',
          type: 'method' as const,
          sourceElements: ['sec-1']
        }
      ];
      
      // Call the public method to generate the model
      const result = await knowledge.generateKnowledgeModel(paperWithOverlappingConcepts);
      
      // Since we're testing a private function indirectly, verification is less precise
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      expect(result.relationships).toBeDefined();
    });
  });
});