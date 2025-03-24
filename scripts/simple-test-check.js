#!/usr/bin/env node
/**
 * Simple Test Coverage Check
 * Checks if the targeted test file exists and if it improved coverage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure paths
const projectRoot = path.resolve(__dirname, '..');
const targetedTestFilePath = path.join(projectRoot, 'tests/paper_architect/targeted-extraction-test.ts');

// Check if the targeted test file exists
console.log('Checking for targeted test file...');
if (fs.existsSync(targetedTestFilePath)) {
  console.log(`Found targeted test file: ${targetedTestFilePath}`);
  const stats = fs.statSync(targetedTestFilePath);
  console.log(`File size: ${Math.round(stats.size / 1024)}KB`);
  
  // Peek at test content
  const content = fs.readFileSync(targetedTestFilePath, 'utf8');
  const testCount = (content.match(/test\(/g) || []).length;
  console.log(`Contains approximately ${testCount} tests`);
  
  // Check the coverage report in ./coverage
  const coveragePath = path.join(projectRoot, 'coverage/coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Try to find extraction module coverage
    for (const filePath in coverageData) {
      if (filePath.includes('paper_architect/extraction')) {
        console.log(`\nCoverage for ${filePath}:`);
        const metrics = coverageData[filePath];
        console.log(`- Statements: ${metrics.statements.pct}%`);
        console.log(`- Functions: ${metrics.functions.pct}%`);
        console.log(`- Lines: ${metrics.lines.pct}%`);
        console.log(`- Branches: ${metrics.branches.pct}%`);
      }
    }
  } else {
    console.log('\nNo coverage report found. Need to run tests with coverage first.');
  }
} else {
  console.log('Targeted test file not found. Run the target-test-generator.js script first.');
}