/**
 * End-to-end tests for the paper_architect module
 * 
 * These tests simulate an actual workflow from paper to code implementation.
 * 
 * Note: These tests are skipped by default as they require:
 * 1. A running GROBID server
 * 2. An actual paper PDF file
 * 3. Real file system operations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as paperArchitect from '../src/paper_architect';

// Path to a test paper for E2E testing
// This can be configured via environment variable for CI/CD
const testPaperPath = process.env.TEST_PAPER_PATH || path.join(__dirname, 'fixtures/test-paper.pdf');
const outputDir = path.join(__dirname, 'e2e-test-output');

// Skip all tests in this file
const runE2ETests = process.env.RUN_E2E_TESTS === 'true';
const testOrSkip = runE2ETests ? test : test.skip;

describe('paper_architect end-to-end', () => {
  let sessionId: string;
  
  // Set up test environment
  beforeAll(() => {
    // Create test output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Check if test paper exists or create a dummy one
    if (!fs.existsSync(testPaperPath)) {
      const fixturesDir = path.dirname(testPaperPath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      fs.writeFileSync(testPaperPath, 'Mock PDF content for testing');
    }
  });
  
  // Clean up after tests
  afterAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  testOrSkip('should process a paper and generate all expected artifacts', async () => {
    // Process the paper
    sessionId = await paperArchitect.initializePaperImplementation(testPaperPath, {
      outputDirectory: outputDir,
      implementationLanguage: 'python',
      generateExecutableSpecs: true,
      generateImplementationPlan: true,
      generateTraceabilityMatrix: true
    });
    
    // Verify session ID was generated
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    
    // Check if output files were created
    expect(fs.existsSync(path.join(outputDir, 'paper_content.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'knowledge_model.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'traceability_matrix.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'traceability_visualization.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'implementation_plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'executable_specs'))).toBe(true);
  });
  
  testOrSkip('should retrieve the paper content', () => {
    const paperContent = paperArchitect.getPaperContent(sessionId);
    
    // Verify paper content structure
    expect(paperContent).toBeDefined();
    expect(paperContent.paperInfo).toBeDefined();
    expect(paperContent.sections).toBeDefined();
    expect(paperContent.algorithms).toBeDefined();
    expect(Array.isArray(paperContent.sections)).toBe(true);
  });
  
  testOrSkip('should retrieve the knowledge model', () => {
    const knowledgeGraph = paperArchitect.getKnowledgeModel(sessionId);
    
    // Verify knowledge graph structure
    expect(knowledgeGraph).toBeDefined();
    expect(knowledgeGraph.concepts).toBeDefined();
    expect(knowledgeGraph.relationships).toBeDefined();
    expect(Array.isArray(knowledgeGraph.concepts)).toBe(true);
    expect(Array.isArray(knowledgeGraph.relationships)).toBe(true);
  });
  
  testOrSkip('should retrieve the implementation plan', () => {
    const plan = paperArchitect.getImplementationPlan(sessionId);
    
    // Verify implementation plan structure
    expect(plan).toBeDefined();
    expect(plan.stages).toBeDefined();
    expect(plan.verificationStrategy).toBeDefined();
    expect(Array.isArray(plan.stages)).toBe(true);
  });
  
  testOrSkip('should update traceability with code elements', async () => {
    // Create a code mapping
    const codeMapping = [
      {
        paperElementId: 'concept-1', // This ID would normally come from the actual knowledge graph
        codeElement: {
          id: 'class-1',
          type: 'class',
          name: 'TestImplementation',
          filePath: 'src/test.py',
          lineNumbers: [10, 50]
        },
        type: 'implements',
        confidence: 0.9,
        notes: 'Implementation of main concept'
      }
    ];
    
    // Update traceability
    const updatedMatrix = await paperArchitect.updateTraceabilityMatrix(sessionId, codeMapping);
    
    // Verify traceability matrix update
    expect(updatedMatrix).toBeDefined();
    expect(updatedMatrix.codeElements.length).toBeGreaterThan(0);
    expect(updatedMatrix.relationships.length).toBeGreaterThan(0);
    
    // Verify the code element was added
    const addedCodeElement = updatedMatrix.codeElements.find(el => el.name === 'TestImplementation');
    expect(addedCodeElement).toBeDefined();
  });
  
  testOrSkip('should generate a verification report', async () => {
    // Create test results
    const testResults = [
      {
        specificationId: 'spec-1', // This ID would normally come from actual specs
        fixture: [
          {
            id: 'fixture-1',
            passed: true,
            expected: true,
            actual: true
          }
        ]
      }
    ];
    
    // Generate verification report
    const report = await paperArchitect.generateVerificationReport(sessionId, testResults);
    
    // Verify report structure
    expect(report).toBeDefined();
    expect(typeof report).toBe('string');
    expect(report).toContain('Verification Report');
    expect(report).toContain('PASSED');
  });
});
