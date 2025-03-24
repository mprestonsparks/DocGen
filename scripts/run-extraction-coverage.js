/**
 * Script to run extraction tests and display simplified coverage results
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File to save the coverage report to
const reportFile = path.join(__dirname, 'extraction-coverage-report.txt');

try {
  // Run with the standard test files first
  console.log('Running standard extraction tests...');
  const standardOutput = execSync('npm run test:extraction -- --silent', { 
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
  
  // Get and save the standard coverage stats
  const standardCoverage = checkCoverage();
  let report = 'EXTRACTION MODULE COVERAGE\n';
  report += '========================\n\n';
  report += 'Standard Tests Coverage:\n';
  report += `-----------------------\n`;
  report += standardCoverage;
  
  // Run with targeted test files
  console.log('\nRunning targeted extraction tests...');
  const targetedOutput = execSync('npm run test:extraction:targeted -- --silent', { 
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
  
  // Get and save the combined coverage stats
  const combinedCoverage = checkCoverage();
  report += '\nCombined with Targeted Tests:\n';
  report += `--------------------------\n`;
  report += combinedCoverage;
  
  // Save the report
  fs.writeFileSync(reportFile, report);
  
  // Show the report
  console.log('\n' + report);
  console.log(`\nCoverage report saved to: ${reportFile}`);
  
} catch (error) {
  console.error('Error running tests:', error.message);
}

function checkCoverage() {
  try {
    // Read the coverage summary
    const coverageSummaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
    
    if (fs.existsSync(coverageSummaryPath)) {
      const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      
      // Find the extraction module
      const extractionModule = Object.keys(coverageSummary).find(key => 
        key.includes('paper_architect/extraction/index'));
      
      if (extractionModule) {
        const extractionCoverage = coverageSummary[extractionModule];
        let output = '';
        output += `Statements: ${extractionCoverage.statements.pct}% (${extractionCoverage.statements.covered}/${extractionCoverage.statements.total})\n`;
        output += `Branches: ${extractionCoverage.branches.pct}% (${extractionCoverage.branches.covered}/${extractionCoverage.branches.total})\n`;
        output += `Functions: ${extractionCoverage.functions.pct}% (${extractionCoverage.functions.covered}/${extractionCoverage.functions.total})\n`;
        output += `Lines: ${extractionCoverage.lines.pct}% (${extractionCoverage.lines.covered}/${extractionCoverage.lines.total})\n`;
        return output;
      } else {
        return 'Extraction module not found in coverage data\n';
      }
    } else {
      return 'Coverage summary file not found\n';
    }
  } catch (error) {
    return `Error reading coverage data: ${error.message}\n`;
  }
}