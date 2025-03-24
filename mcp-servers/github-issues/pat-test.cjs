#!/usr/bin/env node
/**
 * GitHub Personal Access Token Tester
 * 
 * This script tests the GitHub PAT to verify it's working correctly.
 */

require('dotenv').config();
const { Octokit } = require('@octokit/rest');

// Print information about the environment
console.log("GitHub PAT Diagnostic Tool");
console.log("-----------------------");
console.log(`Owner: ${process.env.GITHUB_OWNER}`);
console.log(`Repo: ${process.env.GITHUB_REPO}`);
console.log(`Token: ${process.env.GITHUB_TOKEN?.substring(0, 5)}...`);
console.log(`Token length: ${process.env.GITHUB_TOKEN?.length || 0}`);
console.log("-----------------------\n");

// Test the PAT
async function testPAT() {
  try {
    // Create Octokit instance with the PAT
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    
    // Check authentication status
    console.log("Testing authentication...");
    try {
      const { data: user } = await octokit.users.getAuthenticated();
      console.log(`✅ Authenticated as: ${user.login}`);
    } catch (error) {
      console.error(`❌ Authentication failed: ${error.message}`);
      return false;
    }
    
    // Test repository access
    console.log("\nTesting repository access...");
    try {
      const { data: repo } = await octokit.repos.get({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO
      });
      console.log(`✅ Repository access successful: ${repo.full_name}`);
    } catch (error) {
      console.error(`❌ Repository access failed: ${error.message}`);
      console.error("   - This could be due to insufficient permissions or repository not existing");
      return false;
    }
    
    // Test issues access
    console.log("\nTesting issues access...");
    try {
      const { data: issues } = await octokit.issues.listForRepo({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        per_page: 1
      });
      console.log(`✅ Successfully accessed ${issues.length} issues`);
    } catch (error) {
      console.error(`❌ Issues access failed: ${error.message}`);
      console.error("   - Check if token has 'repo' scope");
      return false;
    }
    
    console.log("\n✅ All tests passed! PAT is working correctly.");
    return true;
  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}`);
    return false;
  }
}

// Run the test
testPAT().then(success => {
  if (!success) {
    console.log("\nSuggestions to fix PAT issues:");
    console.log("1. Regenerate the token - it may have expired or been revoked");
    console.log("2. Verify the token has 'repo' scope");
    console.log("3. Check that the repo owner and name are correct");
    console.log("4. Make sure you're a collaborator on the repository");
    process.exit(1);
  }
});