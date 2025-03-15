/**
 * GitHub Issues MCP Server for Claude Code
 * 
 * This server implements the Claude Code MCP (Model Control Protocol) interface
 * for interacting with GitHub Issues.
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Octokit } = require('@octokit/rest');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'github-issues-mcp.log' })
  ]
});

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Default configuration
const defaultConfig = {
  owner: process.env.GITHUB_OWNER || 'mprestonsparks',
  repo: process.env.GITHUB_REPO || 'DocGen'
};

/**
 * MCP Server Capabilities
 */
app.get('/capabilities', (req, res) => {
  res.json({
    name: 'GitHub Issues MCP',
    version: '0.1.0',
    description: 'GitHub Issues integration for Claude Code',
    capabilities: [
      {
        name: 'getIssues',
        description: 'Get issues from a GitHub repository',
        parameters: {
          state: { type: 'string', description: 'Issue state (open, closed, all)', default: 'open' },
          labels: { type: 'string', description: 'Comma-separated list of label names', optional: true },
          since: { type: 'string', description: 'ISO 8601 timestamp', optional: true },
          limit: { type: 'number', description: 'Maximum number of issues to return', default: 10 }
        }
      },
      {
        name: 'getIssue',
        description: 'Get a specific GitHub issue by number',
        parameters: {
          issueNumber: { type: 'number', description: 'The issue number' }
        }
      },
      {
        name: 'createIssue',
        description: 'Create a new GitHub issue',
        parameters: {
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue body' },
          labels: { type: 'array', description: 'Array of label names', optional: true },
          assignees: { type: 'array', description: 'Array of assignee usernames', optional: true }
        }
      },
      {
        name: 'updateIssue',
        description: 'Update an existing GitHub issue',
        parameters: {
          issueNumber: { type: 'number', description: 'The issue number' },
          title: { type: 'string', description: 'New issue title', optional: true },
          body: { type: 'string', description: 'New issue body', optional: true },
          state: { type: 'string', description: 'Issue state (open, closed)', optional: true },
          labels: { type: 'array', description: 'New array of label names', optional: true },
          assignees: { type: 'array', description: 'New array of assignee usernames', optional: true }
        }
      },
      {
        name: 'addComment',
        description: 'Add a comment to a GitHub issue',
        parameters: {
          issueNumber: { type: 'number', description: 'The issue number' },
          body: { type: 'string', description: 'Comment body' }
        }
      },
      {
        name: 'getImplementationStatus',
        description: 'Get implementation status information',
        parameters: {}
      }
    ]
  });
});

/**
 * Get issues from a GitHub repository
 */
app.post('/getIssues', async (req, res) => {
  try {
    const { state = 'open', labels, since, limit = 10 } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    logger.info('Getting issues', { owner: config.owner, repo: config.repo, state, labels });
    
    const params = {
      owner: config.owner,
      repo: config.repo,
      state,
      per_page: limit,
      sort: 'updated',
      direction: 'desc'
    };
    
    if (labels) params.labels = labels;
    if (since) params.since = since;
    
    const { data } = await octokit.issues.listForRepo(params);
    
    // Format the response
    const issues = data.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      body: issue.body,
      labels: issue.labels.map(label => label.name),
      assignees: issue.assignees.map(assignee => assignee.login)
    }));
    
    res.json({ success: true, issues });
  } catch (error) {
    logger.error('Error getting issues', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get a specific GitHub issue by number
 */
app.post('/getIssue', async (req, res) => {
  try {
    const { issueNumber } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!issueNumber) {
      return res.status(400).json({ success: false, error: 'Issue number is required' });
    }
    
    logger.info('Getting issue', { owner: config.owner, repo: config.repo, issueNumber });
    
    const { data } = await octokit.issues.get({
      owner: config.owner,
      repo: config.repo,
      issue_number: issueNumber
    });
    
    // Format the response
    const issue = {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
      body: data.body,
      labels: data.labels.map(label => label.name),
      assignees: data.assignees.map(assignee => assignee.login)
    };
    
    res.json({ success: true, issue });
  } catch (error) {
    logger.error('Error getting issue', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create a new GitHub issue
 */
app.post('/createIssue', async (req, res) => {
  try {
    const { title, body, labels, assignees } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    
    logger.info('Creating issue', { owner: config.owner, repo: config.repo, title });
    
    const params = {
      owner: config.owner,
      repo: config.repo,
      title,
      body
    };
    
    if (labels) params.labels = labels;
    if (assignees) params.assignees = assignees;
    
    const { data } = await octokit.issues.create(params);
    
    res.json({
      success: true,
      issue: {
        number: data.number,
        title: data.title,
        url: data.html_url
      }
    });
  } catch (error) {
    logger.error('Error creating issue', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update an existing GitHub issue
 */
app.post('/updateIssue', async (req, res) => {
  try {
    const { issueNumber, title, body, state, labels, assignees } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!issueNumber) {
      return res.status(400).json({ success: false, error: 'Issue number is required' });
    }
    
    logger.info('Updating issue', { owner: config.owner, repo: config.repo, issueNumber });
    
    const params = {
      owner: config.owner,
      repo: config.repo,
      issue_number: issueNumber
    };
    
    if (title !== undefined) params.title = title;
    if (body !== undefined) params.body = body;
    if (state !== undefined) params.state = state;
    if (labels !== undefined) params.labels = labels;
    if (assignees !== undefined) params.assignees = assignees;
    
    const { data } = await octokit.issues.update(params);
    
    res.json({
      success: true,
      issue: {
        number: data.number,
        title: data.title,
        state: data.state,
        url: data.html_url
      }
    });
  } catch (error) {
    logger.error('Error updating issue', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add a comment to a GitHub issue
 */
app.post('/addComment', async (req, res) => {
  try {
    const { issueNumber, body } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!issueNumber) {
      return res.status(400).json({ success: false, error: 'Issue number is required' });
    }
    
    if (!body) {
      return res.status(400).json({ success: false, error: 'Comment body is required' });
    }
    
    logger.info('Adding comment', { owner: config.owner, repo: config.repo, issueNumber });
    
    const { data } = await octokit.issues.createComment({
      owner: config.owner,
      repo: config.repo,
      issue_number: issueNumber,
      body
    });
    
    res.json({
      success: true,
      comment: {
        id: data.id,
        body: data.body,
        url: data.html_url
      }
    });
  } catch (error) {
    logger.error('Error adding comment', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get implementation status information
 */
app.post('/getImplementationStatus', async (req, res) => {
  try {
    const config = { ...defaultConfig, ...req.body };
    
    logger.info('Getting implementation status', { owner: config.owner, repo: config.repo });
    
    // Get implementation-gap labeled issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: config.owner,
      repo: config.repo,
      labels: 'implementation-gap'
    });
    
    // Process issues to extract implementation status
    const implementationStatus = {
      totalIssues: issues.length,
      openIssues: issues.filter(issue => issue.state === 'open').length,
      closedIssues: issues.filter(issue => issue.state === 'closed').length,
      byModule: {}
    };
    
    // Extract module information from issue bodies
    issues.forEach(issue => {
      const moduleMatch = issue.body.match(/module: "([^"]+)"/);
      if (moduleMatch) {
        const module = moduleMatch[1];
        
        if (!implementationStatus.byModule[module]) {
          implementationStatus.byModule[module] = {
            issues: 0,
            openIssues: 0,
            closedIssues: 0
          };
        }
        
        implementationStatus.byModule[module].issues++;
        
        if (issue.state === 'open') {
          implementationStatus.byModule[module].openIssues++;
        } else {
          implementationStatus.byModule[module].closedIssues++;
        }
      }
    });
    
    res.json({ success: true, implementationStatus });
  } catch (error) {
    logger.error('Error getting implementation status', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`GitHub Issues MCP server running on port ${PORT}`);
});

// Export for testing
module.exports = app;