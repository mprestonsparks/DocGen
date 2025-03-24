// DocGen Docker Workflow Entrypoint
// This JavaScript file serves as a bridge to execute TypeScript in Docker
// Using proper ES Module syntax as required by package.json "type": "module"

// Load the necessary Node.js modules
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Banner
console.log('\n=============================================');
console.log('     DocGen Docker Workflow Execution');
console.log('=============================================');

// Execute the TypeScript workflow directly
console.log('Executing workflow with ts-node...');
const result = spawnSync('npx', [
  'ts-node',
  '--skipProject', // Skip looking for a project config file
  '--transpile-only', // Skip type checking for faster execution
  'docker-workflow.ts'
], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Check result
if (result.status !== 0) {
  console.error('Workflow execution failed with code:', result.status);
  process.exit(result.status || 1);
}

// Success banner
console.log('\n=============================================');
console.log('     DocGen Workflow Execution Complete');
console.log('=============================================');
