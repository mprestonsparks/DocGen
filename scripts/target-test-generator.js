#!/usr/bin/env node
/**
 * Target Test Generator
 * 
 * A simpler script that focuses on generating targeted tests for specific components
 * without the complexity of the full auto-test-workflow.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure paths
const projectRoot = path.resolve(__dirname, '..');
const extractionModulePath = path.join(projectRoot, 'src/paper_architect/extraction/index.ts');
const testFilePath = path.join(projectRoot, 'tests/paper_architect/extraction/extraction.test.ts');
const targetedTestFilePath = path.join(projectRoot, 'tests/paper_architect/targeted-extraction-test.ts');

// Create a new targeted test file from scratch
console.log('Analyzing extraction module...');

// Read the extraction module to identify key functions to test
const extractionSource = fs.readFileSync(extractionModulePath, 'utf8');

// Extract async function declarations using regex
const asyncFunctionRegex = /async\s+function\s+(\w+)/g;
const asyncFunctions = [];
let match;
while ((match = asyncFunctionRegex.exec(extractionSource)) !== null) {
  asyncFunctions.push(match[1]);
}

console.log(`Found ${asyncFunctions.length} async functions to target:`);
console.log(asyncFunctions.join(', '));

// Generate tests specifically targeting uncovered paths
const testContent = `/**
 * Targeted tests for paper_architect/extraction module
 * Generated on ${new Date().toISOString()}
 * 
 * These tests target specific functions and code paths that are not covered by existing tests.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as extraction from '../../../src/paper_architect/extraction';
import * as llm from '../../../src/utils/llm';

// Mock dependencies
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('Mock file content'),
  createReadStream: jest.fn().mockReturnValue({ pipe: jest.fn() })
}));

jest.mock('http', () => ({
  request: jest.fn().mockImplementation((url, options, callback) => {
    const mockResponse = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event, handler) => {
        if (event === 'data') {
          handler('<TEI><teiHeader><fileDesc><titleStmt><title>Test Paper</title></titleStmt></fileDesc></teiHeader><text><body><div><head>1. Introduction</head><p>Test content</p></div></body></text></TEI>');
        }
        if (event === 'end') {
          handler();
        }
        return mockResponse;
      })
    };
    if (callback) callback(mockResponse);
    return {
      on: jest.fn(),
      pipe: jest.fn(),
      end: jest.fn()
    };
  })
}));

jest.mock('../../../src/utils/llm', () => ({
  enhanceWithLLM: jest.fn().mockImplementation((prompt, options) => {
    return Promise.resolve({
      enhanced: true,
      result: "Enhanced content",
      originalContent: prompt
    });
  })
}));

describe('Targeted Extraction Tests', () => {
  console.log('RUNNING TARGETED EXTRACTION TESTS');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic extraction workflow
  test('extractPaperContent should process PDF files correctly', async () => {
    // Setup mocks for PDF format
    jest.spyOn(path, 'extname').mockReturnValue('.pdf');
    
    console.log('Testing PDF extraction...');
    const result = await extraction.extractPaperContent('/path/to/file.pdf');
    console.log('PDF extraction result received:', !!result);
    
    expect(result).toBeDefined();
    expect(result.paperInfo).toBeDefined();
    expect(result.paperInfo.title).toBe('Test Paper');
  });

  // Test for text files (fallback extraction)
  test('extractPaperContent should handle text files with fallback extraction', async () => {
    // Setup mocks for text format
    jest.spyOn(path, 'extname').mockReturnValue('.txt');
    jest.spyOn(fs, 'readFileSync').mockReturnValue('# Test Paper\\n## Introduction\\nThis is a test paper.');
    
    console.log('Testing text file fallback extraction...');
    const result = await extraction.extractPaperContent('/path/to/file.txt');
    console.log('Text extraction result received:', !!result);
    
    expect(result).toBeDefined();
    expect(result.paperInfo).toBeDefined();
    expect(result.sections).toBeDefined();
  });

  // Test error handling in GROBID processing
  test('extractPaperContent should handle GROBID connection errors', async () => {
    // Setup mock for GROBID connection error
    jest.spyOn(http, 'request').mockImplementation(() => {
      return {
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'error') handler(new Error('Connection refused'));
          return { pipe: jest.fn() };
        }),
        pipe: jest.fn(),
        end: jest.fn()
      };
    });
    
    console.log('Testing GROBID connection error handling...');
    const result = await extraction.extractPaperContent('/path/to/file.pdf');
    console.log('GROBID error handling result received:', !!result);
    
    expect(result).toBeDefined();
    expect(result.error).toBeDefined();
  });

  // Test for malformed XML from GROBID
  test('extractPaperContent should handle malformed XML from GROBID', async () => {
    // Setup mock for malformed XML
    jest.spyOn(http, 'request').mockImplementation((url, options, callback) => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'data') {
            handler('<TEI><malformed>Bad XML</TEI>');
          }
          if (event === 'end') {
            handler();
          }
          return mockResponse;
        })
      };
      if (callback) callback(mockResponse);
      return {
        on: jest.fn(),
        pipe: jest.fn(),
        end: jest.fn()
      };
    });
    
    console.log('Testing malformed XML handling...');
    const result = await extraction.extractPaperContent('/path/to/file.pdf');
    console.log('Malformed XML handling result received:', !!result);
    
    expect(result).toBeDefined();
    // Should still have basic structure even with parse errors
    expect(result.paperInfo).toBeDefined();
  });

  // Test LLM enhancement failures
  test('extraction should handle LLM enhancement failures gracefully', async () => {
    // Mock LLM to throw an error
    jest.spyOn(llm, 'enhanceWithLLM').mockImplementation(() => {
      throw new Error('LLM service unavailable');
    });
    
    console.log('Testing LLM failure handling...');
    const result = await extraction.extractPaperContent('/path/to/file.pdf');
    console.log('LLM failure handling result received:', !!result);
    
    // Extraction should continue even if LLM fails
    expect(result).toBeDefined();
    expect(result.paperInfo).toBeDefined();
    expect(result.sections).toBeDefined();
  });

  // Target each of the specific async functions for coverage
  ${asyncFunctions.map(funcName => `
  test('${funcName} should execute without errors', async () => {
    console.log('Testing ${funcName}...');
    
    // Only test if the function is exported
    if (typeof extraction.${funcName} === 'function') {
      let result;
      // Try to call the function with sensible mock parameters based on name
      if (funcName.toLowerCase().includes('algorithm')) {
        result = await extraction.${funcName}('<algorithm>Test algorithm</algorithm>');
      } else if (funcName.toLowerCase().includes('section')) {
        result = await extraction.${funcName}([{ title: 'Test Section', content: 'Test content' }]);
      } else if (funcName.toLowerCase().includes('paper')) {
        result = await extraction.${funcName}('/path/to/test.pdf');
      } else if (funcName.toLowerCase().includes('grobid')) {
        result = await extraction.${funcName}('/path/to/test.pdf');
      } else if (funcName.toLowerCase().includes('enhance')) {
        result = await extraction.${funcName}({ content: 'Test content to enhance' });
      } else {
        // Generic fallback for unknown function types
        result = await extraction.${funcName}('test input');
      }
      
      console.log('${funcName} result received:', !!result);
      
      // Verify result exists but don't make assumptions about its structure
      expect(result).toBeDefined();
    } else {
      console.log('Function ${funcName} is not exported and cannot be tested directly');
    }
  });`).join('\n')}
})`;

// Write the targeted test file
try {
  // Create directory if it doesn't exist
  const testDir = path.dirname(targetedTestFilePath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  fs.writeFileSync(targetedTestFilePath, testContent);
  console.log(`Created targeted test file: ${targetedTestFilePath}`);
  
  // Run the targeted tests with coverage output
  console.log('Running targeted tests...');
  try {
    execSync(`npm test -- ${targetedTestFilePath} --coverage`, { stdio: 'inherit' });
    console.log('Targeted tests completed.');
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
} catch (error) {
  console.error('Error creating test file:', error.message);
}