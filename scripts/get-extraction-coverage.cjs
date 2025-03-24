/**
 * Script to get coverage data for extraction module
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Running extraction tests and collecting coverage data...');
  
  // Run jest with the --json flag to get results in JSON format
  const testOutput = execSync(
    'npx jest tests/paper_architect/extraction/extraction.test.ts --coverage --json',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  
  // Parse the JSON output from Jest
  const testResult = JSON.parse(testOutput);
  
  // Find the extraction module in the coverage results
  const coverageSummary = testResult.coverageMap;
  const extractionModule = Object.keys(coverageSummary).find(key => 
    key.includes('paper_architect/extraction/index')
  );
  
  if (extractionModule) {
    const extractionCoverage = coverageSummary[extractionModule];
    
    console.log('\n======== Extraction Module Coverage ========');
    console.log(`Statements: ${extractionCoverage.statementMap ? Object.keys(extractionCoverage.statementMap).length : 'N/A'} total`);
    console.log(`Covered statements: ${extractionCoverage.s ? Object.values(extractionCoverage.s).filter(v => v > 0).length : 'N/A'}`);
    
    console.log(`\nFunctions: ${extractionCoverage.fnMap ? Object.keys(extractionCoverage.fnMap).length : 'N/A'} total`);
    console.log(`Covered functions: ${extractionCoverage.f ? Object.values(extractionCoverage.f).filter(v => v > 0).length : 'N/A'}`);
    
    console.log(`\nBranches: ${extractionCoverage.branchMap ? Object.keys(extractionCoverage.branchMap).length : 'N/A'} total`);
    console.log(`Covered branches: ${Object.keys(extractionCoverage.b || {}).length}`);
    
    // Save the detailed coverage data
    const outputFile = path.join(__dirname, 'extraction-coverage-details.json');
    fs.writeFileSync(outputFile, JSON.stringify(extractionCoverage, null, 2));
    console.log(`\nDetailed coverage data saved to: ${outputFile}`);
    
  } else {
    console.log('Extraction module not found in coverage data');
    console.log('Available modules:');
    console.log(Object.keys(coverageSummary).join('\n'));
  }
} catch (error) {
  console.error('Error running tests or processing coverage data:', error.message);
}