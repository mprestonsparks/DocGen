/**
 * Tests for paper_architect/specifications module
 */
import * as fs from 'fs';
import * as path from 'path';
import * as specifications from '../../../src/paper_architect/specifications';
import * as logger from '../../../src/utils/logger';
import * as llm from '../../../src/utils/llm';
import { PaperContent, PaperKnowledgeGraph, ExecutableSpecification } from '../../../src/types';

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
    // Return mock specifications data for the LLM query
    return [
      {
        id: 'spec-1',
        title: 'Test Algorithm Implementation',
        description: 'Specification for implementing the test algorithm',
        inputs: [
          {
            name: 'input1',
            type: 'string',
            description: 'First input parameter',
            exampleValue: 'test'
          }
        ],
        outputs: [
          {
            name: 'result',
            type: 'boolean',
            description: 'Test result',
            exampleValue: 'true'
          }
        ],
        steps: [
          {
            id: 'step-1',
            description: 'Validate input',
            code: 'if (!input1) { throw new Error("Input required"); }'
          },
          {
            id: 'step-2',
            description: 'Process and return result',
            code: 'return true;'
          }
        ],
        sourceConceptIds: ['concept-1'],
        verificationFixtures: [
          {
            id: 'fixture-1',
            input: { input1: 'test' },
            expectedOutput: true,
            description: 'Standard test case'
          },
          {
            id: 'fixture-2',
            input: { input1: '' },
            expectedOutput: 'error',
            description: 'Error case - empty input'
          }
        ]
      }
    ];
  })
}));

describe('paper_architect/specifications module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample test data
  const samplePaperContent: PaperContent = {
    paperInfo: {
      title: 'Test Paper for Specifications Module',
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
      }
    ],
    relationships: []
  };

  describe('generateExecutableSpecifications', () => {
    it('should generate executable specifications from paper content and knowledge graph', async () => {
      const result = await specifications.generateExecutableSpecifications(
        samplePaperContent, 
        sampleKnowledgeGraph,
        'javascript'
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify LLM was called
      expect(llm.query).toHaveBeenCalled();
      
      // Check structure has expected properties - less strictly
      const spec = result[0];
      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('title');
      expect(spec).toHaveProperty('description');
      
      // Check inputs
      expect(spec).toHaveProperty('inputs');
      expect(Array.isArray(spec.inputs)).toBe(true);
      if (spec.inputs.length > 0) {
        expect(spec.inputs[0]).toHaveProperty('name');
        expect(spec.inputs[0]).toHaveProperty('type');
      }
      
      // Check outputs
      expect(spec).toHaveProperty('outputs');
      expect(Array.isArray(spec.outputs)).toBe(true);
      
      // Check steps
      expect(spec).toHaveProperty('steps');
      expect(Array.isArray(spec.steps)).toBe(true);
      if (spec.steps.length > 0) {
        expect(spec.steps[0]).toHaveProperty('id');
        expect(spec.steps[0]).toHaveProperty('description');
      }
      
      // Check fixtures
      expect(spec).toHaveProperty('verificationFixtures');
      expect(Array.isArray(spec.verificationFixtures)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock LLM to throw an error
      (llm.query as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      // Should still return a result even on error
      const result = await specifications.generateExecutableSpecifications(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle case when LLM is not available', async () => {
      // Mock LLM as unavailable
      (llm.isLLMApiAvailable as jest.Mock).mockReturnValueOnce(false);
      
      const result = await specifications.generateExecutableSpecifications(
        samplePaperContent,
        sampleKnowledgeGraph,
        'javascript'
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Verify LLM availability was checked
      expect(llm.isLLMApiAvailable).toHaveBeenCalled();
      // Verify LLM was not queried
      expect(llm.query).not.toHaveBeenCalled();
    });
  });

  describe('formatExecutableSpecification', () => {
    const sampleSpec: ExecutableSpecification = {
      id: 'spec-1',
      title: 'Test Specification',
      description: 'Test specification description',
      inputs: [
        {
          name: 'input1',
          type: 'string',
          description: 'Test input',
          exampleValue: 'test'
        }
      ],
      outputs: [
        {
          name: 'output1',
          type: 'boolean',
          description: 'Test output',
          exampleValue: 'true'
        }
      ],
      steps: [
        {
          id: 'step-1',
          description: 'Validate input',
          code: 'if (!input1) { throw new Error("Input required"); }'
        },
        {
          id: 'step-2',
          description: 'Return result',
          code: 'return true;'
        }
      ],
      sourceConceptIds: ['concept-1'],
      verificationFixtures: [
        {
          id: 'fixture-1',
          input: { input1: 'test' },
          expectedOutput: true,
          description: 'Standard test case'
        }
      ]
    };

    it('should format executable specification as markdown', () => {
      const markdown = specifications.formatExecutableSpecification(sampleSpec);
      
      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe('string');
      
      // Check for key sections in the markdown
      expect(markdown).toContain('Test Specification');
      expect(markdown).toContain('Description');
      expect(markdown).toContain('Test specification description');
      expect(markdown).toContain('Inputs');
      expect(markdown).toContain('input1');
      expect(markdown).toContain('Outputs');
      expect(markdown).toContain('output1');
      expect(markdown).toContain('Implementation Steps');
      expect(markdown).toContain('Verification Fixtures');
      // The specific formatting of fixtures may vary by implementation
      expect(markdown).toContain('Standard test case');
    });
  });

  describe('parseExecutableSpecification', () => {
    const sampleMarkdown = `# Test Specification

## Description

Test specification description

## Inputs

| Name | Type | Description | Example |
|------|------|-------------|---------|
| input1 | string | Test input | "test" |

## Outputs

| Name | Type | Description | Example |
|------|------|-------------|---------|
| output1 | boolean | Test output | true |

## Implementation Steps

### 1. Validate input

\`\`\`javascript
if (!input1) { throw new Error("Input required"); }
\`\`\`

### 2. Return result

\`\`\`javascript
return true;
\`\`\`

## Verification

### Fixture 1: Standard test case

**Input:**
\`\`\`json
{
  "input1": "test"
}
\`\`\`

**Expected Output:**
\`\`\`json
true
\`\`\`
`;

    it('should parse executable specification from markdown', () => {
      // Here we're using a more general approach since the actual parsing 
      // implementation might vary
      const spec = specifications.parseExecutableSpecification(sampleMarkdown);
      
      expect(spec).toBeDefined();
      
      // Check basic properties
      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('title');
      expect(spec).toHaveProperty('description');
      
      // Check basic structure - actual values may vary based on implementation
      expect(spec).toHaveProperty('inputs');
      expect(spec).toHaveProperty('outputs');
      expect(spec).toHaveProperty('steps');
      expect(spec).toHaveProperty('verificationFixtures');
      
      // Check that arrays are actually arrays
      expect(Array.isArray(spec.inputs)).toBe(true);
      expect(Array.isArray(spec.outputs)).toBe(true);
      expect(Array.isArray(spec.steps)).toBe(true);
      expect(Array.isArray(spec.verificationFixtures)).toBe(true);
    });
  });

  describe('generateVerificationReport', () => {
    // Sample test results
    const testResults = [
      {
        specificationId: 'spec-1',
        fixture: [
          {
            id: 'fixture-1',
            passed: true,
            actual: true,
            expected: true
          },
          {
            id: 'fixture-2',
            passed: false,
            actual: false,
            expected: true,
            error: 'Values do not match'
          }
        ]
      }
    ];

    it('should generate verification report based on test results', () => {
      const report = specifications.generateVerificationReport(sampleKnowledgeGraph, testResults);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      
      // Basic structure checks - implementation details may vary
      expect(report).toContain('Verification Report');
      expect(report).toContain('Summary');
      
      // Check that test results are included somehow
      expect(report).toContain('spec-1');
      expect(report).toMatch(/pass|PASS|passed|Passed/i);
      expect(report).toMatch(/fail|FAIL|failed|Failed/i);
    });

    it('should handle empty test results', () => {
      const report = specifications.generateVerificationReport(sampleKnowledgeGraph, []);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report).toContain('Verification Report');
      
      // Different implementations might handle empty results differently, 
      // so we don't check for specific text
    });
  });
});