/**
 * Simple script to check the coverage of extraction module
 */
const fs = require('fs');
const path = require('path');

// Wait for coverage files to be available
setTimeout(() => {
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
        console.log('\n======== Extraction Module Coverage ========');
        console.log(`Statements: ${extractionCoverage.statements.pct}%`);
        console.log(`Branches: ${extractionCoverage.branches.pct}%`);
        console.log(`Functions: ${extractionCoverage.functions.pct}%`);
        console.log(`Lines: ${extractionCoverage.lines.pct}%`);
        console.log('\nCovered/Total:');
        console.log(`Statements: ${extractionCoverage.statements.covered}/${extractionCoverage.statements.total}`);
        console.log(`Branches: ${extractionCoverage.branches.covered}/${extractionCoverage.branches.total}`);
        console.log(`Functions: ${extractionCoverage.functions.covered}/${extractionCoverage.functions.total}`);
        console.log(`Lines: ${extractionCoverage.lines.covered}/${extractionCoverage.lines.total}`);
        console.log('==========================================\n');
      } else {
        console.log('Extraction module not found in coverage data');
        console.log('Available modules:');
        console.log(Object.keys(coverageSummary).filter(key => !key.startsWith('total')).join('\n'));
      }
    } else {
      console.log('Coverage summary file not found at:', coverageSummaryPath);
    }
  } catch (error) {
    console.error('Error reading coverage data:', error.message);
  }
}, 1000); // Wait 1 second to ensure file is written