#!/usr/bin/env node
/**
 * GitHub Token Test
 * 
 * This script tests if the GitHub token in the MCP server's .env file
 * is valid by attempting to access the repository.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Parse the .env file
const envPath = path.resolve(__dirname, 'mcp-servers/github-issues/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  }
});

// Extract token and repo information
const token = envVars.GITHUB_TOKEN;
const owner = envVars.GITHUB_OWNER;
const repo = envVars.GITHUB_REPO;

if (!token || token === 'null') {
  console.error('No GitHub token found in .env file.');
  process.exit(1);
}

if (!owner || !repo) {
  console.error('Repository information missing from .env file.');
  process.exit(1);
}

// Test the token by making a GitHub API request
async function testGitHubToken() {
  try {
    console.log(`Testing GitHub token for repository: ${owner}/${repo}`);
    
    // Debug token format - first 5 characters (don't log the whole token)
    console.log(`Token starts with: ${token.substring(0, 5)}...`);
    console.log(`Token length: ${token.length}`);
    
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ GitHub token is valid!');
      console.log(`Repository: ${response.data.full_name}`);
      console.log(`Description: ${response.data.description || 'No description'}`);
      console.log(`Visibility: ${response.data.private ? 'Private' : 'Public'}`);
      return true;
    } else {
      console.error(`❌ Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ GitHub token validation failed:');
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('   - Error 401: Unauthorized. The token is invalid or expired.');
          break;
        case 403:
          console.error('   - Error 403: Forbidden. The token does not have sufficient permissions.');
          console.error('     Make sure the token has the "repo" scope.');
          break;
        case 404:
          console.error('   - Error 404: Not Found. The repository does not exist or the token');
          console.error(`     does not have access to ${owner}/${repo}.`);
          break;
        default:
          console.error(`   - Error ${error.response.status}: ${error.response.data.message || 'Unknown error'}`);
      }
    } else {
      console.error(`   - ${error.message}`);
    }
    
    return false;
  }
}

// Run the test
testGitHubToken().then(isValid => {
  if (!isValid) {
    console.log('\nRecommendations:');
    console.log('1. Generate a new personal access token at https://github.com/settings/tokens');
    console.log('2. Make sure the token has the "repo" scope');
    console.log('3. Update the GITHUB_TOKEN in mcp-servers/github-issues/.env');
    process.exit(1);
  }
});