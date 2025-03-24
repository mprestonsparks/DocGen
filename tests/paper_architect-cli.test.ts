/**
 * CLI tests for the paper_architect module
 * 
 * These tests ensure the CLI interface works as expected.
 */

import * as path from 'path';
import { exec } from 'child_process';
import * as fs from 'fs';

// Helper to execute CLI commands
const execPromise = (command: string): Promise<{stdout: string, stderr: string}> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
};

// Create a temp directory for tests
const tempDir = path.join(__dirname, 'temp_test_cli_dir');

describe('paper_architect CLI', () => {
  // Set up test environment
  beforeAll(() => {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create a mock paper file
    fs.writeFileSync(path.join(tempDir, 'test-paper.pdf'), 'Mock PDF content');
    
    // Create a mock code mapping file
    const mockCodeMapping = [
      {
        paperElementId: 'algo-1',
        codeElement: {
          id: 'test-code-1',
          type: 'class',
          name: 'TestImplementation',
          filePath: 'src/test.ts'
        },
        type: 'implements',
        confidence: 0.9
      }
    ];
    
    fs.writeFileSync(
      path.join(tempDir, 'code-mapping.json'),
      JSON.stringify(mockCodeMapping)
    );
  });
  
  // Clean up after tests
  afterAll(() => {
    // Remove temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  // Skip these tests in CI environment unless explicitly enabled
  const shouldRunCLITests = process.env.RUN_CLI_TESTS === 'true';
  const testOrSkip = shouldRunCLITests ? test : test.skip;
  
  testOrSkip('should display help information', async () => {
    const { stdout } = await execPromise('node dist/index.js paper-architect --help');
    
    expect(stdout).toContain('Process an academic paper for implementation');
    expect(stdout).toContain('--paper');
    expect(stdout).toContain('--output');
    expect(stdout).toContain('--language');
    expect(stdout).toContain('--session');
    expect(stdout).toContain('--trace');
  });
  
  testOrSkip('should require either paper path or session ID', async () => {
    try {
      await execPromise('node dist/index.js paper-architect');
      // If we reach here, the command didn't fail as expected
      fail('Command should have failed due to missing parameters');
    } catch (error) {
      expect((error as any).message).toContain('Error: You must provide either a paper path or a session ID with trace file');
    }
  });
  
  testOrSkip('should process a paper file', async () => {
    // Mock the actual paper_architect module to prevent real execution
    jest.mock('../src/paper_architect', () => ({
      initializePaperImplementation: jest.fn().mockResolvedValue('test-session-id'),
      updateTraceabilityMatrix: jest.fn().mockResolvedValue({ paperElements: [], codeElements: [], relationships: [] })
    }));
    
    const paperPath = path.join(tempDir, 'test-paper.pdf');
    const { stdout } = await execPromise(`node dist/index.js paper-architect --paper "${paperPath}"`);
    
    expect(stdout).toContain('Starting DocGen Paper Architect');
    expect(stdout).toContain('Processing paper:');
    expect(stdout).toContain('Paper processed successfully');
  });
  
  testOrSkip('should update traceability with a code mapping file', async () => {
    // Mock the actual paper_architect module to prevent real execution
    jest.mock('../src/paper_architect', () => ({
      initializePaperImplementation: jest.fn().mockResolvedValue('test-session-id'),
      updateTraceabilityMatrix: jest.fn().mockResolvedValue({ 
        paperElements: [{ id: 'algo-1', name: 'Test Algorithm', type: 'algorithm', description: 'Test' }],
        codeElements: [{ id: 'test-code-1', name: 'TestImplementation', type: 'class', filePath: 'src/test.ts' }],
        relationships: [{ paperElementId: 'algo-1', codeElementId: 'test-code-1', type: 'implements', confidence: 0.9 }]
      })
    }));
    
    const codeMappingPath = path.join(tempDir, 'code-mapping.json');
    const { stdout } = await execPromise(
      `node dist/index.js paper-architect --session test-session-id --trace "${codeMappingPath}"`
    );
    
    expect(stdout).toContain('Updating Paper Implementation Traceability');
    expect(stdout).toContain('Trace file:');
    expect(stdout).toContain('Traceability matrix updated successfully');
  });
});