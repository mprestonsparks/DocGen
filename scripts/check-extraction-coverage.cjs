/**
 * Script to run extraction tests and display coverage summary (CommonJS version)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Run tests with coverage
  console.log('Running extraction tests with coverage...');
  execSync('npm test -- tests/paper_architect/extraction/extraction.test.ts tests/paper_architect/targeted-extraction-test.ts --coverage --silent', {
    stdio: ['ignore', 'pipe', 'inherit']
  });
  
  // Read the coverage summary from the generated file
  const coverageSummaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  
  if (fs.existsSync(coverageSummaryPath)) {
    const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    
    // Extract extraction module coverage
    const extractionModule = Object.keys(coverageSummary).find(key => 
      key.includes('paper_architect/extraction/index'));
    
    if (extractionModule) {
      const extractionCoverage = coverageSummary[extractionModule];
      console.log('\nExtraction Module Coverage Summary:');
      console.log('---------------------------------');
      console.log(`Statements: ${extractionCoverage.statements.pct}%`);
      console.log(`Branches: ${extractionCoverage.branches.pct}%`);
      console.log(`Functions: ${extractionCoverage.functions.pct}%`);
      console.log(`Lines: ${extractionCoverage.lines.pct}%`);
      console.log('\nCovered/Total:');
      console.log(`Statements: ${extractionCoverage.statements.covered}/${extractionCoverage.statements.total}`);
      console.log(`Branches: ${extractionCoverage.branches.covered}/${extractionCoverage.branches.total}`);
      console.log(`Functions: ${extractionCoverage.functions.covered}/${extractionCoverage.functions.total}`);
      console.log(`Lines: ${extractionCoverage.lines.covered}/${extractionCoverage.lines.total}`);
    } else {
      console.log('Extraction module coverage data not found');
    }
  } else {
    console.log('Coverage summary file not found. Check if tests ran successfully.');
  }
} catch (error) {
  console.error('Error running tests:', error.message);
}