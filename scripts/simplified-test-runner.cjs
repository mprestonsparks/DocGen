/**
 * Simplified test runner for extraction module
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const projectRoot = path.resolve(__dirname, '..');
const extractionPath = path.join(projectRoot, 'src', 'paper_architect', 'extraction');
const testPath = path.join(projectRoot, 'tests', 'paper_architect', 'extraction');

// Generate a targeted test for extraction module
function generateTargetedTest() {
  console.log('Generating targeted test for extraction module...');
  
  const testContent = `/**
 * Simplified test for extraction module
 * Generated on ${new Date().toISOString()}
 */
import * as fs from 'fs';
import * as path from 'path';
import * as extraction from '../../../src/paper_architect/extraction';

// Mock dependencies
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('Mock file content')
}));

jest.mock('http', () => ({
  request: jest.fn().mockImplementation((url, options, callback) => {
    if (callback) {
      callback({ 
        statusCode: 200,
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'data') handler('<TEI><teiHeader><fileDesc><titleStmt><title>Test</title></titleStmt></fileDesc></teiHeader></TEI>');
          if (event === 'end') handler();
          return { on: jest.fn() }
        })
      });
    }
    return { 
      on: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis() 
    };
  })
}));

describe('Simple extraction tests', () => {
  console.log('VERIFICATION: Running simplified extraction tests');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic test for main extraction function
  test('extractPaperContent should handle PDF files', async () => {
    console.log('Testing PDF extraction');
    const result = await extraction.extractPaperContent('/path/to/paper.pdf');
    console.log('PDF extraction completed with result:', !!result);
    expect(result).toBeDefined();
    expect(result.paperInfo).toBeDefined();
  });
  
  // Test for error handling with missing file
  test('extractPaperContent should handle missing files', async () => {
    console.log('Testing missing file handling');
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    
    await expect(extraction.extractPaperContent('/missing/file.pdf'))
      .rejects.toThrow();
    
    console.log('Missing file test completed');
  });
});
`;

  // Write the test file
  const targetedTestFile = path.join(testPath, 'simplified-test.ts');
  fs.writeFileSync(targetedTestFile, testContent);
  console.log('Targeted test file created at:', targetedTestFile);
  
  return targetedTestFile;
}

// Run tests and report results
function runTest(testFile) {
  console.log(`Running test file: ${testFile}`);
  
  try {
    // Run the test with Jest
    const result = execSync(`npx jest ${testFile} --no-cache`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    console.log('Test completed successfully');
    
    // Extract and display test results
    const passMatch = result.match(/(\d+) passing/);
    const failMatch = result.match(/(\d+) failing/);
    
    const passing = passMatch ? parseInt(passMatch[1]) : 0;
    const failing = failMatch ? parseInt(failMatch[1]) : 0;
    
    console.log(`Tests passing: ${passing}`);
    console.log(`Tests failing: ${failing}`);
    
    return passing > 0 && failing === 0;
  } catch (error) {
    console.error('Error running test:', error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('==== Simplified Test Runner for Extraction Module ====');
  
  // Generate targeted test
  const testFile = generateTargetedTest();
  
  // Run the test
  const success = runTest(testFile);
  
  console.log('\nTest execution complete');
  process.exit(success ? 0 : 1);
}

main();