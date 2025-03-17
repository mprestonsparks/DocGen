/**
 * Simple script to fetch GitHub issues and output them to console
 */
require('dotenv').config();
const { Octokit } = require('@octokit/rest');

// For public repositories, we can access issues without authentication
const octokit = new Octokit();

// Default configuration from .env
const owner = process.env.GITHUB_OWNER || 'mprestonsparks';
const repo = process.env.GITHUB_REPO || 'DocGen';

async function getIssues() {
  try {
    console.log(`Fetching open issues for ${owner}/${repo}...`);
    
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    
    console.log(`Found ${data.length} open issues:`);
    
    data.forEach(issue => {
      console.log(`\n#${issue.number}: ${issue.title}`);
      console.log(`URL: ${issue.html_url}`);
      console.log(`Labels: ${issue.labels.map(label => label.name).join(', ') || 'none'}`);
      console.log(`Created: ${new Date(issue.created_at).toLocaleDateString()}`);
      console.log(`Updated: ${new Date(issue.updated_at).toLocaleDateString()}`);
      
      // Print a shortened body
      if (issue.body) {
        const shortBody = issue.body.length > 150 
          ? issue.body.substring(0, 147) + '...' 
          : issue.body;
        console.log(`Description: ${shortBody.replace(/\n/g, ' ')}`);
      }
    });
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

getIssues();