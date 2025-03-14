/**
 * Performance tests for the paper_architect module
 * 
 * These tests measure the performance of key operations.
 * They are skipped by default but can be enabled for benchmarking.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as paperArchitect from '../src/paper_architect';
import * as extraction from '../src/paper_architect/extraction';
import * as knowledge from '../src/paper_architect/knowledge';
import * as specifications from '../src/paper_architect/specifications';
import * as traceability from '../src/paper_architect/traceability';
import * as workflow from '../src/paper_architect/workflow';

// Performance test timings (in milliseconds)
const PERF_THRESHOLDS = {
  EXTRACTION: 5000,    // Paper extraction should take less than 5 seconds
  KNOWLEDGE: 2000,     // Knowledge graph generation should take less than 2 seconds
  SPECIFICATIONS: 3000, // Specification generation should take less than 3 seconds
  TRACEABILITY: 1000,  // Traceability matrix generation should take less than 1 second
  WORKFLOW: 1000,      // Workflow generation should take less than 1 second
  TOTAL: 10000,        // Full pipeline should take less than 10 seconds
};

// Sample mock data
const mockPaperContent = {
  paperInfo: {
    title: 'Performance Test Paper',
    authors: ['Test Author'],
    abstract: 'Abstract for performance testing',
    year: 2023
  },
  sections: Array(50).fill(0).map((_, i) => ({
    id: `sec-${i + 1}`,
    level: Math.floor(i / 10) + 1,
    title: `Section ${i + 1}`,
    content: `Content for section ${i + 1} with enough text to make it realistic for testing.`.repeat(20),
    subsections: []
  })),
  algorithms: Array(10).fill(0).map((_, i) => ({
    id: `algo-${i + 1}`,
    name: `Algorithm ${i + 1}`,
    description: `Description for algorithm ${i + 1}`,
    pseudocode: `function algorithm${i + 1}() {\n  // Step 1\n  // Step 2\n  // Step 3\n  return result;\n}`,
    inputs: ['input1', 'input2'],
    outputs: ['output'],
    sectionId: `sec-${i + 1}`
  })),
  equations: Array(20).fill(0).map((_, i) => ({
    id: `eq-${i + 1}`,
    content: `y = x^${i + 1} + ${i}`,
    sectionId: `sec-${Math.floor(Math.random() * 50) + 1}`
  })),
  figures: [],
  tables: [],
  citations: []
};

// Mock knowledge graph
const mockKnowledgeGraph = {
  concepts: Array(100).fill(0).map((_, i) => ({
    id: `concept-${i + 1}`,
    name: `Concept ${i + 1}`,
    description: `Description for concept ${i + 1}`,
    type: i % 5 === 0 ? 'algorithm' : i % 5 === 1 ? 'method' : i % 5 === 2 ? 'dataStructure' : i % 5 === 3 ? 'parameter' : 'concept',
    sourceElements: [`sec-${Math.floor(Math.random() * 50) + 1}`]
  })),
  relationships: Array(200).fill(0).map((_, i) => ({
    id: `rel-${i + 1}`,
    sourceId: `concept-${Math.floor(Math.random() * 100) + 1}`,
    targetId: `concept-${Math.floor(Math.random() * 100) + 1}`,
    type: i % 5 === 0 ? 'uses' : i % 5 === 1 ? 'implements' : i % 5 === 2 ? 'extends' : i % 5 === 3 ? 'dependsOn' : 'refines',
    description: `Relationship ${i + 1}`
  }))
};

// Conditionally run or skip tests based on environment
const testOrSkip = process.env.RUN_PERF_TESTS === 'true' ? it : it.skip;

describe('paper_architect performance', () => {
  // Performance tests need longer timeouts
  beforeAll(() => {
    jest.setTimeout(30000); // Increase timeout for performance tests
  });
  
  testOrSkip('should extract paper content within performance threshold', async () => {
    // Mock the file reading to avoid actual PDF processing
    jest.spyOn(fs, 'readFileSync').mockReturnValue('Mock PDF content');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    
    const startTime = Date.now();
    
    // Create a mock processWithGrobid function to return structured content
    const originalProcessWithGrobid = (extraction as any).processWithGrobid;
    (extraction as any).processWithGrobid = jest.fn().mockResolvedValue('<TEI>Mock XML content</TEI>');
    
    try {
      await extraction.extractPaperContent('mock-paper.pdf');
      
      const duration = Date.now() - startTime;
      console.log(`Paper extraction took ${duration}ms`);
      
      expect(duration).toBeLessThan(PERF_THRESHOLDS.EXTRACTION);
    } finally {
      // Restore original function
      (extraction as any).processWithGrobid = originalProcessWithGrobid;
    }
  });
  
  testOrSkip('should generate knowledge model within performance threshold', async () => {
    const startTime = Date.now();
    
    await knowledge.generateKnowledgeModel(mockPaperContent);
    
    const duration = Date.now() - startTime;
    console.log(`Knowledge model generation took ${duration}ms`);
    
    expect(duration).toBeLessThan(PERF_THRESHOLDS.KNOWLEDGE);
  });
  
  testOrSkip('should generate specifications within performance threshold', async () => {
    const startTime = Date.now();
    
    await specifications.generateExecutableSpecifications(
      mockPaperContent,
      mockKnowledgeGraph,
      'python'
    );
    
    const duration = Date.now() - startTime;
    console.log(`Specification generation took ${duration}ms`);
    
    expect(duration).toBeLessThan(PERF_THRESHOLDS.SPECIFICATIONS);
  });
  
  testOrSkip('should generate traceability matrix within performance threshold', () => {
    const startTime = Date.now();
    
    traceability.generateInitialTraceabilityMatrix(mockPaperContent, mockKnowledgeGraph);
    
    const duration = Date.now() - startTime;
    console.log(`Traceability matrix generation took ${duration}ms`);
    
    expect(duration).toBeLessThan(PERF_THRESHOLDS.TRACEABILITY);
  });
  
  testOrSkip('should generate implementation plan within performance threshold', async () => {
    const startTime = Date.now();
    
    await workflow.generateImplementationPlan(
      mockPaperContent,
      mockKnowledgeGraph,
      'python'
    );
    
    const duration = Date.now() - startTime;
    console.log(`Implementation plan generation took ${duration}ms`);
    
    expect(duration).toBeLessThan(PERF_THRESHOLDS.WORKFLOW);
  });
  
  testOrSkip('should run the entire pipeline within performance threshold', async () => {
    // Mock filesystem operations
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined as any);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
    
    // Mock extraction to avoid actual PDF processing
    jest.spyOn(extraction, 'extractPaperContent').mockResolvedValue(mockPaperContent);
    
    const startTime = Date.now();
    
    await paperArchitect.initializePaperImplementation('mock-paper.pdf', {
      outputDirectory: 'output',
      implementationLanguage: 'python'
    });
    
    const duration = Date.now() - startTime;
    console.log(`Full pipeline took ${duration}ms`);
    
    expect(duration).toBeLessThan(PERF_THRESHOLDS.TOTAL);
  });
  
  testOrSkip('should handle large paper content efficiently', async () => {
    // Create a very large mock paper
    const largeMockPaperContent = {
      ...mockPaperContent,
      sections: Array(500).fill(0).map((_, i) => ({
        id: `sec-${i + 1}`,
        level: Math.floor(i / 50) + 1,
        title: `Section ${i + 1}`,
        content: `Content for section ${i + 1}`.repeat(100),
        subsections: []
      })),
      algorithms: Array(50).fill(0).map((_, i) => ({
        id: `algo-${i + 1}`,
        name: `Algorithm ${i + 1}`,
        description: `Description for algorithm ${i + 1}`,
        pseudocode: `function algorithm${i + 1}() {\n  // Steps\n}`.repeat(20),
        inputs: ['input1', 'input2'],
        outputs: ['output'],
        sectionId: `sec-${i + 1}`
      }))
    };
    
    // Create a very large knowledge graph
    const largeKnowledgeGraph = {
      concepts: Array(1000).fill(0).map((_, i) => ({
        id: `concept-${i + 1}`,
        name: `Concept ${i + 1}`,
        description: `Description for concept ${i + 1}`,
        type: i % 5 === 0 ? 'algorithm' : i % 5 === 1 ? 'method' : i % 5 === 2 ? 'dataStructure' : i % 5 === 3 ? 'parameter' : 'concept',
        sourceElements: [`sec-${Math.floor(Math.random() * 500) + 1}`]
      })),
      relationships: Array(2000).fill(0).map((_, i) => ({
        id: `rel-${i + 1}`,
        sourceId: `concept-${Math.floor(Math.random() * 1000) + 1}`,
        targetId: `concept-${Math.floor(Math.random() * 1000) + 1}`,
        type: i % 5 === 0 ? 'uses' : i % 5 === 1 ? 'implements' : i % 5 === 2 ? 'extends' : i % 5 === 3 ? 'dependsOn' : 'refines',
        description: `Relationship ${i + 1}`
      }))
    };
    
    // Test specification generation with large content
    const startTime = Date.now();
    
    await specifications.generateExecutableSpecifications(
      largeMockPaperContent,
      largeKnowledgeGraph,
      'python'
    );
    
    const duration = Date.now() - startTime;
    console.log(`Specification generation for large content took ${duration}ms`);
    
    // Adjust threshold for large content
    expect(duration).toBeLessThan(PERF_THRESHOLDS.SPECIFICATIONS * 10);
  });
});