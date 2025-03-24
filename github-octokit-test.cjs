#!/usr/bin/env node
/**
 * GitHub Octokit Test
 * 
 * Tests the GitHub PAT token directly using the Octokit library
 * instead of Axios, which might handle token formats differently.
 */

require('dotenv').config({ path: './mcp-servers/github-issues/.env' });
const { Octokit } = require('@octokit/rest');

// Test the actual token through Octokit which is more reliable
async function testOctokit() {
  console.log("Testing GitHub API with Octokit...");
  
  // This is how the application actually uses the token
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  // Let's log info about the token to help debug
  console.log(`Token starts with: ${process.env.GITHUB_TOKEN.substring(0, 5)}...`);
  console.log(`Token length: ${process.env.GITHUB_TOKEN.length}`);
  
  try {
    // Test the simplest API call - getting authenticated user info
    console.log("Making API request to get authenticated user info...");
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Success! Authenticated as: ${data.login}`);
    return true;
  } catch (error) {
    console.error("❌ Error authenticating with GitHub API:");
    
    if (error.status === 401) {
      console.error("   - 401 Unauthorized: Token is invalid or expired");
      console.error("   - This typically means the token needs to be regenerated");
    } else if (error.status === 403) {
      console.error("   - 403 Forbidden: Token doesn't have the required permissions");
      console.error("   - Make sure the token has the 'repo' scope");
    } else if (error.message.includes("Bad credentials")) {
      console.error("   - Bad credentials: The format of the token might be incorrect");
      console.error("   - GitHub tokens should begin with 'ghp_', 'gho_', or 'github_pat_'");
    } else {
      console.error(`   - ${error.message}`);
    }
    
    return false;
  }
}

// Test the token
testOctokit().then(isValid => {
  if (!isValid) {
    console.log("\nRecommendations:");
    console.log("1. Check that the token is not expired (GitHub fine-grain tokens expire)");
    console.log("2. Verify the token has 'repo' scope");
    console.log("3. Create a new token at https://github.com/settings/tokens");
    console.log("4. Make sure to copy the entire token without any extra spaces or characters");
    process.exit(1);
  }
});