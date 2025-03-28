/**
 * Testing service for MCP Server
 * Handles test discovery, execution, and analysis
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger, logError } from '../utils/logger';

const execAsync = promisify(exec);

// Base workspace directory
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/workspace';

/**
 * Test result interface
 */
export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stackTrace?: string;
}

/**
 * Test run summary interface
 */
export interface TestRunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: Record<string, TestResult>;
}

/**
 * Test history entry interface
 */
export interface TestHistoryEntry {
  timestamp: string;
  summary: TestRunSummary;
}

/**
 * Discover tests in the project
 */
export const discoverTests = async (
  directory: string = '',
  pattern: string = '**/*.test.{ts,js}'
): Promise<string[]> => {
  try {
    const searchDir = path.join(WORKSPACE_DIR, directory);
    
    // Check if directory exists
    if (!fs.existsSync(searchDir)) {
      throw new Error(`Directory not found: ${searchDir}`);
    }
    
    // Use find command to discover test files
    const { stdout } = await execAsync(`find ${searchDir} -name "*.test.ts" -o -name "*.test.js" -o -name "*_test.ts" -o -name "*_test.js"`);
    
    // Parse and return test files
    const testFiles = stdout.trim().split('\n').filter(Boolean);
    
    // Extract test names from files
    const tests: string[] = [];
    
    for (const file of testFiles) {
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract test names using regex
      const testRegex = /(?:it|test)\s*\(\s*['"](.+?)['"]/g;
      let match;
      
      while ((match = testRegex.exec(content)) !== null) {
        tests.push(`${path.relative(WORKSPACE_DIR, file)}:${match[1]}`);
      }
    }
    
    return tests;
  } catch (error) {
    logError('Failed to discover tests', error as Error);
    throw error;
  }
};

/**
 * Run tests
 */
export const runTests = async (
  tests?: string[],
  directory: string = '',
  parallel: boolean = true
): Promise<TestRunSummary> => {
  try {
    const testDir = directory ? path.join(WORKSPACE_DIR, directory) : WORKSPACE_DIR;
    
    // Check if directory exists
    if (!fs.existsSync(testDir)) {
      throw new Error(`Directory not found: ${testDir}`);
    }
    
    // Determine test command based on project
    let testCommand = '';
    
    if (fs.existsSync(path.join(testDir, 'package.json'))) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(testDir, 'package.json'), 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts.test) {
        testCommand = 'npm test';
      } else if (fs.existsSync(path.join(testDir, 'node_modules', '.bin', 'jest'))) {
        testCommand = './node_modules/.bin/jest';
      } else if (fs.existsSync(path.join(testDir, 'node_modules', '.bin', 'mocha'))) {
        testCommand = './node_modules/.bin/mocha';
      }
    }
    
    if (!testCommand) {
      throw new Error('No test command found in project');
    }
    
    // Add test filter if specific tests are provided
    if (tests && tests.length > 0) {
      // Extract file paths from test identifiers
      const testFiles = [...new Set(tests.map(test => test.split(':')[0]))];
      testCommand += ` ${testFiles.join(' ')}`;
    }
    
    // Add parallel flag if needed
    if (parallel) {
      testCommand += ' --parallel';
    }
    
    // Add JSON reporter for parsing results
    testCommand += ' --json --outputFile=test-results.json';
    
    // Run tests
    const startTime = Date.now();
    await execAsync(testCommand, { cwd: testDir });
    const endTime = Date.now();
    
    // Parse test results
    const resultsPath = path.join(testDir, 'test-results.json');
    
    if (!fs.existsSync(resultsPath)) {
      throw new Error('Test results file not found');
    }
    
    const rawResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    // Clean up results file
    fs.unlinkSync(resultsPath);
    
    // Format results
    const results: Record<string, TestResult> = {};
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    // Parse results based on test runner format
    if (rawResults.testResults) {
      // Jest format
      for (const suiteResult of rawResults.testResults) {
        for (const testResult of suiteResult.testResults) {
          const status = testResult.status === 'passed' ? 'passed' : 
                        testResult.status === 'skipped' ? 'skipped' : 'failed';
          
          if (status === 'passed') passed++;
          else if (status === 'failed') failed++;
          else skipped++;
          
          results[testResult.fullName] = {
            name: testResult.fullName,
            status,
            duration: testResult.duration / 1000,
            error: testResult.failureMessages ? testResult.failureMessages.join('\n') : undefined,
            stackTrace: testResult.failureMessages ? testResult.failureMessages.join('\n') : undefined
          };
        }
      }
    } else if (rawResults.stats) {
      // Mocha format
      for (const test of rawResults.tests) {
        const status = test.pass ? 'passed' : 
                      test.pending ? 'skipped' : 'failed';
        
        if (status === 'passed') passed++;
        else if (status === 'failed') failed++;
        else skipped++;
        
        results[test.fullTitle] = {
          name: test.fullTitle,
          status,
          duration: test.duration / 1000,
          error: test.err ? test.err.message : undefined,
          stackTrace: test.err ? test.err.stack : undefined
        };
      }
    }
    
    // Create summary
    const summary: TestRunSummary = {
      total: passed + failed + skipped,
      passed,
      failed,
      skipped,
      duration: (endTime - startTime) / 1000,
      results
    };
    
    // Save to history
    saveTestHistory(summary);
    
    return summary;
  } catch (error) {
    logError('Failed to run tests', error as Error);
    throw error;
  }
};

/**
 * Analyze test failures
 */
export const analyzeTestFailures = async (
  testResults: TestRunSummary
): Promise<Record<string, { cause: string; suggestion: string }>> => {
  try {
    const analysis: Record<string, { cause: string; suggestion: string }> = {};
    
    // Extract failed tests
    const failedTests = Object.values(testResults.results).filter(test => test.status === 'failed');
    
    for (const test of failedTests) {
      // Simple analysis based on error message patterns
      let cause = 'Unknown error';
      let suggestion = 'Review the test and implementation code';
      
      if (test.error) {
        if (test.error.includes('AssertionError') || test.error.includes('Expected')) {
          cause = 'Assertion failure';
          suggestion = 'Check if the expected and actual values match';
        } else if (test.error.includes('TypeError')) {
          cause = 'Type error';
          suggestion = 'Ensure all variables have the correct type';
        } else if (test.error.includes('ReferenceError')) {
          cause = 'Reference error';
          suggestion = 'Make sure all variables are defined before use';
        } else if (test.error.includes('timeout')) {
          cause = 'Test timeout';
          suggestion = 'Check for asynchronous operations that may not complete';
        }
      }
      
      analysis[test.name] = { cause, suggestion };
    }
    
    return analysis;
  } catch (error) {
    logError('Failed to analyze test failures', error as Error);
    throw error;
  }
};

/**
 * Save test run history
 */
const saveTestHistory = (summary: TestRunSummary): void => {
  try {
    const historyDir = path.join(WORKSPACE_DIR, '.mcp', 'test-history');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    // Create history entry
    const entry: TestHistoryEntry = {
      timestamp: new Date().toISOString(),
      summary
    };
    
    // Save to file
    const historyFile = path.join(historyDir, `${entry.timestamp.replace(/:/g, '-')}.json`);
    fs.writeFileSync(historyFile, JSON.stringify(entry, null, 2));
    
    // Update latest summary
    fs.writeFileSync(
      path.join(historyDir, 'latest.json'),
      JSON.stringify(entry, null, 2)
    );
    
    logger.info(`Test history saved to ${historyFile}`);
  } catch (error) {
    logError('Failed to save test history', error as Error);
  }
};

/**
 * Get test history
 */
export const getTestHistory = async (
  limit: number = 10
): Promise<TestHistoryEntry[]> => {
  try {
    const historyDir = path.join(WORKSPACE_DIR, '.mcp', 'test-history');
    
    // Check if directory exists
    if (!fs.existsSync(historyDir)) {
      return [];
    }
    
    // Get history files
    const files = fs.readdirSync(historyDir)
      .filter(file => file !== 'latest.json')
      .sort()
      .reverse()
      .slice(0, limit);
    
    // Read and parse history entries
    const history: TestHistoryEntry[] = [];
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
      history.push(JSON.parse(content));
    }
    
    return history;
  } catch (error) {
    logError('Failed to get test history', error as Error);
    throw error;
  }
};

/**
 * Identify flaky tests
 */
export const identifyFlakyTests = async (
  minRuns: number = 3
): Promise<Record<string, { runs: number; failures: number; flakyScore: number }>> => {
  try {
    // Get test history
    const history = await getTestHistory(10);
    
    if (history.length < minRuns) {
      return {};
    }
    
    // Collect test results across runs
    const testStats: Record<string, { runs: number; failures: number }> = {};
    
    for (const entry of history) {
      for (const [testName, result] of Object.entries(entry.summary.results)) {
        if (!testStats[testName]) {
          testStats[testName] = { runs: 0, failures: 0 };
        }
        
        testStats[testName].runs++;
        
        if (result.status === 'failed') {
          testStats[testName].failures++;
        }
      }
    }
    
    // Calculate flaky score (0-1, higher means more flaky)
    const flakyTests: Record<string, { runs: number; failures: number; flakyScore: number }> = {};
    
    for (const [testName, stats] of Object.entries(testStats)) {
      if (stats.runs >= minRuns) {
        const failureRate = stats.failures / stats.runs;
        
        // Only include tests that have some failures but not all failures
        if (failureRate > 0 && failureRate < 1) {
          flakyTests[testName] = {
            ...stats,
            flakyScore: failureRate
          };
        }
      }
    }
    
    return flakyTests;
  } catch (error) {
    logError('Failed to identify flaky tests', error as Error);
    throw error;
  }
};
