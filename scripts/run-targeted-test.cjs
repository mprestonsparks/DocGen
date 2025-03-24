/**
 * Script to run a specific extraction test and report the results
 */
const { spawnSync } = require('child_process');

console.log('Running extraction test with targeted enhancements...');

// Run Jest with the targeted test file
const result = spawnSync('npx', [
  'jest',
  'tests/paper_architect/targeted-extraction-test.ts',
  '--no-coverage' // Skip coverage calculation to reduce output
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'pipe'
});

// Output the results in a readable format
console.log('\n==== TEST EXECUTION RESULTS ====');
if (result.error) {
  console.error('Error running test:', result.error.message);
} else {
  const outputLines = result.output.join('\n')
    .split('\n')
    .filter(line => 
      line && 
      !line.includes('PASS') && 
      !line.includes('console.log') && 
      !line.startsWith(' ') &&
      !line.includes('Watch Usage')
    );
  
  // Show a summary of the results
  const passCount = (result.output.join('\n').match(/PASS/g) || []).length;
  const failCount = (result.output.join('\n').match(/FAIL/g) || []).length;
  
  console.log(`Tests passed: ${passCount}`);
  console.log(`Tests failed: ${failCount}`);
  
  // Show any verification messages from the test execution
  const verificationLogs = result.output.join('\n')
    .split('\n')
    .filter(line => line.includes('VERIFICATION') || line.includes('Testing'));
  
  if (verificationLogs.length > 0) {
    console.log('\n==== TEST VERIFICATION MESSAGES ====');
    console.log(verificationLogs.join('\n'));
  }
}

console.log('\nTest execution complete');