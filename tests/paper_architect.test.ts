/**
 * Tests for the paper_architect module
 */

import * as path from 'path';
import * as fs from 'fs';
import * as paperArchitect from '../src/paper_architect';
import * as utils from '../src/paper_architect/utils';

// Mock logger and llm to avoid external dependencies
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

// Mock fs functions
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('paper_content.json')) {
      return JSON.stringify(mockPaperContent);
    }
    if (path.includes('knowledge_model.json')) {
      return JSON.stringify(mockKnowledgeGraph);
    }
    if (path.includes('traceability_matrix.json')) {
      return JSON.stringify(mockTraceabilityMatrix);
    }
    if (path.includes('implementation_plan.md')) {
      return mockImplementationPlanMarkdown;
    }
    if (path.includes('code-mapping.json')) {
      return JSON.stringify(mockCodeMapping);
    }
    return '';
  }),
  mkdirSync: jest.fn()
}));

// Mock session functions
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
  })
}));

// Mock extraction module
jest.mock('../src/paper_architect/extraction', () => ({
  extractPaperContent: jest.fn().mockResolvedValue(mockPaperContent)
}));

// Mock knowledge module
jest.mock('../src/paper_architect/knowledge', () => ({
  generateKnowledgeModel: jest.fn().mockResolvedValue(mockKnowledgeGraph)
}));

// Mock specifications module
jest.mock('../src/paper_architect/specifications', () => ({
  generateExecutableSpecifications: jest.fn().mockResolvedValue(mockExecutableSpecs),
  formatExecutableSpecification: jest.fn().mockReturnValue('# Mock Executable Spec'),
  parseExecutableSpecification: jest.fn().mockReturnValue(mockExecutableSpecs[0]),
  generateVerificationReport: jest.fn().mockReturnValue('# Mock Verification Report')
}));

// Mock traceability module
jest.mock('../src/paper_architect/traceability', () => ({
  generateInitialTraceabilityMatrix: jest.fn().mockReturnValue(mockTraceabilityMatrix),
  updateTraceabilityMatrix: jest.fn().mockReturnValue({
    ...mockTraceabilityMatrix,
    codeElements: [
      {
        id: 'code-1',
        type: 'class',
        name: 'TestClass',
        filePath: 'test/path.py'
      }
    ],
    relationships: [
      {
        paperElementId: 'algo-1',
        codeElementId: 'code-1',
        type: 'implements',
        confidence: 0.9
      }
    ]
  }),
  generateVisualization: jest.fn().mockReturnValue('<html>Mock Visualization</html>')
}));

// Mock workflow module
jest.mock('../src/paper_architect/workflow', () => ({
  generateImplementationPlan: jest.fn().mockResolvedValue(mockImplementationPlan),
  formatImplementationPlan: jest.fn().mockReturnValue(mockImplementationPlanMarkdown),
  parseImplementationPlan: jest.fn().mockReturnValue(mockImplementationPlan),
  updateImplementationProgress: jest.fn().mockReturnValue({
    ...mockImplementationPlan,
    stages: [
      {
        ...mockImplementationPlan.stages[0],
        components: [
          {
            ...mockImplementationPlan.stages[0].components[0],
            status: 'implemented'
          }
        ]
      }
    ]
  })
}));

// Mock data for tests
const mockPaperContent = {
  paperInfo: {
    title: 'Test Paper',
    authors: ['Author One', 'Author Two'],
    abstract: 'Test paper abstract',
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
      name: 'Test Algorithm',
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

const mockKnowledgeGraph = {
  concepts: [
    {
      id: 'concept-1',
      name: 'Test Concept',
      description: 'Test concept description',
      type: 'algorithm',
      sourceElements: ['algo-1']
    }
  ],
  relationships: []
};

const mockExecutableSpecs = [
  {
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
        description: 'Test step',
        code: 'return true;'
      }
    ],
    sourceConceptIds: ['concept-1'],
    verificationFixtures: [
      {
        id: 'fixture-1',
        input: { input1: 'test' },
        expectedOutput: true,
        description: 'Test fixture'
      }
    ]
  }
];

const mockTraceabilityMatrix = {
  paperElements: [
    {
      id: 'algo-1',
      type: 'algorithm',
      name: 'Test Algorithm',
      description: 'Test algorithm description'
    }
  ],
  codeElements: [],
  relationships: []
};

const mockImplementationPlan = {
  id: 'plan-1',
  title: 'Implementation Plan for Test Paper',
  stages: [
    {
      id: 'stage-1',
      name: 'Foundation Layer',
      description: 'Implement the core components',
      components: [
        {
          id: 'component-1-1',
          name: 'Test Component',
          description: 'Test component description',
          conceptIds: ['concept-1'],
          dependencies: [],
          status: 'notStarted'
        }
      ]
    }
  ],
  verificationStrategy: {
    unitTests: ['Test the component'],
    integrationTests: ['Test the integration'],
    validationExperiments: [
      {
        name: 'Validation Experiment',
        description: 'Test experiment description',
        expectedResults: 'Expected results'
      }
    ]
  }
};

const mockImplementationPlanMarkdown = `# Implementation Plan for Test Paper

## Overview

Implementation plan overview

## Implementation Stages

### Foundation Layer

Implement the core components

| Component | Description | Dependencies | Status |
|-----------|-------------|--------------|--------|
| **Test Component** | Test component description | None | ⬜ Not Started |

## Verification Strategy

### Unit Tests

- Test the component

### Integration Tests

- Test the integration

### Validation Experiments

#### Validation Experiment

Test experiment description

**Expected Results:** Expected results
`;

const mockCodeMapping = [
  {
    paperElementId: 'algo-1',
    codeElement: {
      id: 'code-1',
      type: 'class',
      name: 'TestClass',
      filePath: 'test/path.py'
    },
    type: 'implements',
    confidence: 0.9,
    notes: 'Test implementation'
  }
];

describe('paper_architect module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePaperImplementation', () => {
    it('should initialize a paper implementation', async () => {
      const sessionId = await paperArchitect.initializePaperImplementation('test.pdf', {
        implementationLanguage: 'python'
      });

      expect(sessionId).toBe('test-session-id');
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('updateTraceabilityMatrix', () => {
    it('should update the traceability matrix with code elements', async () => {
      const updatedMatrix = await paperArchitect.updateTraceabilityMatrix('test-session-id', mockCodeMapping);

      expect(updatedMatrix.codeElements.length).toBe(1);
      expect(updatedMatrix.relationships.length).toBe(1);
      expect(updatedMatrix.relationships[0].paperElementId).toBe('algo-1');
      expect(updatedMatrix.relationships[0].codeElementId).toBe('code-1');
    });
  });

  describe('updateImplementationProgress', () => {
    it('should update the implementation progress', async () => {
      const updatedPlan = await paperArchitect.updateImplementationProgress('test-session-id', [
        {
          componentId: 'component-1-1',
          status: 'implemented'
        }
      ]);

      expect(updatedPlan.stages[0].components[0].status).toBe('implemented');
    });
  });

  describe('utils', () => {
    it('should generate a unique ID', () => {
      const id = utils.generateUniqueId('test', 'Test Name');
      expect(id).toMatch(/^test-[a-f0-9]{6}$/);
    });

    it('should slugify a string', () => {
      const slug = utils.slugify('Test String With Spaces');
      expect(slug).toBe('test-string-with-spaces');
    });

    it('should safely parse JSON', () => {
      const validJson = '{"test": true}';
      const invalidJson = 'not json';
      const defaultValue = { default: true };

      expect(utils.safeParseJson(validJson, defaultValue)).toEqual({ test: true });
      expect(utils.safeParseJson(invalidJson, defaultValue)).toEqual(defaultValue);
    });
  });
});