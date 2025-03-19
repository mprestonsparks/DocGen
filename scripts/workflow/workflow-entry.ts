/**
 * DocGen Workflow Entry Point
 * 
 * This script is the main entry point for the DocGen sequential workflow.
 * It follows the TypeScript-only approach and handles ES module compatibility.
 */

// Import the sequential workflow manager
// Using .js extension in import even though this is a TypeScript file
// This is required for ES modules compatibility when compiled to JavaScript
import { runSequentialWorkflow } from './sequential-workflow-manager.js';

// Banner
console.log('\n=============================================');
console.log('     DocGen Sequential Workflow Execution');
console.log('=============================================');
console.log('Starting workflow execution...\n');

// Execute the workflow using IIFE pattern for better async/await handling
(async () => {
  try {
    // Run the workflow
    await runSequentialWorkflow();
    
    // Success message
    console.log('\nWorkflow completed successfully.\n');
    console.log('=============================================');
    console.log('     DocGen Workflow Execution Complete');
    console.log('=============================================');
  } catch (error) {
    // Error handling
    console.error('\nWorkflow execution failed:');
    console.error(error);
    
    console.log('\n=============================================');
    console.log('     DocGen Workflow Execution Failed');
    console.log('=============================================');
    process.exit(1);
  }
})();
