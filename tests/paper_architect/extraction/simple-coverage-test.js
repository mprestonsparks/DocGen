/**
 * Simple test to check if we can run the extraction tests
 */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFilePath = resolve(__dirname, 'extraction.test.ts');
const targetedTestPath = resolve(__dirname, '..', 'targeted-extraction-test.ts');

console.log('Test file exists:', existsSync(testFilePath));
console.log('Targeted test file exists:', existsSync(targetedTestPath));

console.log('\nAttempting to run the extraction test...');
try {
  // Dynamic import in ESM
  const extraction = await import('../../../src/paper_architect/extraction/index.js');
  console.log('Successfully imported extraction module');
  console.log('Available functions:', Object.keys(extraction));
} catch (error) {
  console.error('Error importing extraction module:', error.message);
}

console.log('\nTest completed - please use "npm test:extraction" to run actual tests');