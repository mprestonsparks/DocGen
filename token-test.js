/**
 * Simple test script to check if GitHub token is valid
 */
require('dotenv').config({ path: './mcp-servers/github-issues/.env' });
const { Octokit } = require('@octokit/rest');

console.log('Testing GitHub token...');
console.log('Token format (first few characters):', process.env.GITHUB_TOKEN.substring(0, 4) + '...');

// Create Octokit instance with the token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Test repository access
const owner = process.env.GITHUB_OWNER || 'mprestonsparks';
const repo = process.env.GITHUB_REPO || 'DocGen';

async function testToken() {
  try {
    console.log(`Attempting to access repository: ${owner}/${repo}`);
    
    // Try to get repo info - this will fail if token is invalid or lacks permissions
    const { data: repository } = await octokit.repos.get({
      owner,
      repo
    });
    
    console.log('✅ SUCCESS: GitHub token is valid!');
    console.log(`Repository: ${repository.full_name}`);
    console.log(`Description: ${repository.description}`);
    console.log(`Visibility: ${repository.visibility}`);
    console.log('Token has sufficient permissions to access this repository');
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: GitHub token validation failed');
    console.error(`Error message: ${error.message}`);
    
    if (error.status === 401) {
      console.error('The token is invalid, expired, or has been revoked.');
    } else if (error.status === 403) {
      console.error('The token lacks the required permissions for this repository.');
    } else if (error.status === 404) {
      console.error(`Repository ${owner}/${repo} not found or token lacks access.`);
    }
    
    console.error('Please generate a new token with the "repo" scope at:');
    console.error('https://github.com/settings/tokens');
    
    return false;
  }
}

testToken();