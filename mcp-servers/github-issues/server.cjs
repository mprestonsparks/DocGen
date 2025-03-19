/**
 * GitHub Issues MCP Server for Claude Code
 * 
 * This server implements the Claude Code MCP (Model Context Protocol) interface
 * for interacting with GitHub Issues.
 */

// CommonJS module format
"use strict";
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require('body-parser');
const { Octokit } = require('@octokit/rest');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'github-issues-mcp.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Configure additional file logger for persistent debugging
const debugLogDir = path.join(__dirname, '../../logs/mcp-debug');
if (!fs.existsSync(debugLogDir)) {
  fs.mkdirSync(debugLogDir, { recursive: true });
}
const debugLogPath = path.join(debugLogDir, 'github-auth.log');
const debugLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: debugLogPath,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Function to diagnose token issues
async function diagnoseTokenIssue(token) {
  debugLogger.debug('Diagnosing token issue', { 
    tokenLength: token ? token.length : 0,
    tokenPrefix: token ? token.substring(0, 4) : 'none',
    tokenSet: !!token,
    timestamp: new Date().toISOString()
  });
  
  // Check token format
  if (!token) {
    return {
      issue: 'MISSING_TOKEN',
      description: 'No GitHub token was provided',
      resolution: 'Set GITHUB_TOKEN in .env file'
    };
  }
  
  if (token === 'null' || token === 'undefined' || token === '') {
    return {
      issue: 'EMPTY_TOKEN',
      description: 'GitHub token is empty or set to null/undefined',
      resolution: 'Update GITHUB_TOKEN with a valid token in .env file'
    };
  }
  
  // Test authentication 
  try {
    const octo = new Octokit({ auth: token });
    const { data } = await octo.rest.users.getAuthenticated();
    
    // If we get here, the token is working
    return {
      issue: 'NONE',
      description: 'Token is valid',
      username: data.login
    };
  } catch (error) {
    // Analyze error to determine cause
    if (error.status === 401) {
      return {
        issue: 'UNAUTHORIZED',
        description: 'Token is invalid or expired (401 Unauthorized)',
        errorMessage: error.message,
        resolution: 'Generate a new token at https://github.com/settings/tokens'
      };
    } else if (error.status === 403) {
      return {
        issue: 'FORBIDDEN',
        description: 'Token lacks required permissions (403 Forbidden)',
        errorMessage: error.message,
        resolution: 'Generate a new token with repo scope at https://github.com/settings/tokens'
      };
    } else {
      return {
        issue: 'UNKNOWN_ERROR',
        description: `Unexpected error (${error.status || 'unknown status'})`,
        errorMessage: error.message,
        resolution: 'Check network connectivity and GitHub status'
      };
    }
  }
}

// Initialize GitHub client with thorough error handling
let octokit;
let tokenDiagnosis = null;

// Using IIFE for top-level await in CommonJS
(async function() {
  try {
    const token = process.env.GITHUB_TOKEN;
    
    // Log token information (safely)
    debugLogger.debug('Token information', {
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 4) : 'none',
      tokenSet: !!token
    });
    
    // Diagnose token issues
    tokenDiagnosis = await diagnoseTokenIssue(token);
    debugLogger.debug('Token diagnosis result', tokenDiagnosis);
    
    if (tokenDiagnosis.issue !== 'NONE') {
      // Log detailed error information
      logger.error(`GitHub token issue: ${tokenDiagnosis.description}`);
      logger.error(`Resolution: ${tokenDiagnosis.resolution}`);
      
      // Write to debug log
      debugLogger.error('GitHub authentication failed', tokenDiagnosis);
      
      // Continue without mock data - will fail properly
      octokit = new Octokit({ auth: token });
    } else {
      logger.info(`GitHub token validated successfully. Authenticated as ${tokenDiagnosis.username}`);
      octokit = new Octokit({ auth: token });
    }
  } catch (error) {
    logger.error(`Fatal error initializing GitHub client: ${error.message}`);
    debugLogger.error('GitHub client initialization error', { 
      error: error.message,
      stack: error.stack
    });
    
    // No fallback to mock data - just create a client that will fail appropriately
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
})();

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
      },
      {
        name: 'getPullRequests',
        description: 'Get pull requests from a GitHub repository',
        parameters: {
          state: { type: 'string', description: 'PR state (open, closed, all)', default: 'open' },
          sort: { type: 'string', description: 'Sort field (created, updated, popularity, long-running)', default: 'updated' },
          limit: { type: 'number', description: 'Maximum number of PRs to return', default: 10 }
        }
      },
      {
        name: 'getPullRequest',
        description: 'Get a specific GitHub pull request by number',
        parameters: {
          prNumber: { type: 'number', description: 'The pull request number' }
        }
      },
      {
        name: 'createPullRequest',
        description: 'Create a new GitHub pull request',
        parameters: {
          title: { type: 'string', description: 'Pull request title' },
          body: { type: 'string', description: 'Pull request body' },
          head: { type: 'string', description: 'The name of the branch where your changes are implemented' },
          base: { type: 'string', description: 'The name of the branch you want the changes pulled into', default: 'main' },
          draft: { type: 'boolean', description: 'Whether to create the pull request as a draft', default: false }
        }
      },
      {
        name: 'getFilesChanged',
        description: 'Get files changed in a pull request',
        parameters: {
          prNumber: { type: 'number', description: 'The pull request number' }
        }
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
    
    // Enhanced error details for debugging
    debugLogger.debug('getIssues request', { 
      params: { owner: config.owner, repo: config.repo, state, labels, since, limit },
      tokenStatus: tokenDiagnosis ? tokenDiagnosis.issue : 'UNKNOWN',
      endpoint: '/getIssues'
    });
    
    // Build request parameters
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
    
    // Attempt to get issues from GitHub - no fallback to mock data
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
    
    // Log success
    logger.info(`Successfully retrieved ${issues.length} issues`);
    debugLogger.debug('GitHub issues retrieved successfully', { 
      count: issues.length,
      requestParams: params
    });
    
    res.json({ success: true, issues });
  } catch (error) {
    // Enhanced error logging with detailed diagnostics
    const errorDetails = {
      endpoint: 'getIssues',
      message: error.message,
      status: error.status,
      response: error.response ? {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers
      } : null,
      tokenDiagnosis: tokenDiagnosis
    };
    
    logger.error(`Error getting issues: ${error.message}`);
    debugLogger.error('GitHub issues API error', errorDetails);
    
    // Return detailed error to help debugging
    res.status(error.status || 500).json({ 
      success: false, 
      error: error.message,
      tokenIssue: tokenDiagnosis ? tokenDiagnosis.description : null,
      resolution: tokenDiagnosis ? tokenDiagnosis.resolution : null
    });
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
    
    // Enhanced error details for debugging
    debugLogger.debug('getImplementationStatus request', { 
      params: { owner: config.owner, repo: config.repo },
      tokenStatus: tokenDiagnosis ? tokenDiagnosis.issue : 'UNKNOWN',
      endpoint: '/getImplementationStatus'
    });
    
    // Get implementation-gap labeled issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: config.owner,
      repo: config.repo,
      labels: 'implementation-gap'
    });
    
    // Get coverage-improvement labeled issues
    const { data: coverageIssues } = await octokit.issues.listForRepo({
      owner: config.owner,
      repo: config.repo,
      labels: 'coverage-improvement'
    });
    
    // Get monitoring-system labeled issues
    const { data: monitoringIssues } = await octokit.issues.listForRepo({
      owner: config.owner,
      repo: config.repo,
      labels: 'monitoring-system'
    });
    
    // Process issues to extract implementation status
    const implementationStatus = {
      totalIssues: issues.length,
      openIssues: issues.filter(issue => issue.state === 'open').length,
      closedIssues: issues.filter(issue => issue.state === 'closed').length,
      byModule: {},
      
      // Additional statistics
      coverageIssues: {
        total: coverageIssues.length,
        open: coverageIssues.filter(issue => issue.state === 'open').length,
        closed: coverageIssues.filter(issue => issue.state === 'closed').length
      },
      
      monitoringIssues: {
        total: monitoringIssues.length,
        open: monitoringIssues.filter(issue => issue.state === 'open').length,
        closed: monitoringIssues.filter(issue => issue.state === 'closed').length
      }
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
    
    // Read implementation status report if available (optional enhancement, not mock data)
    try {
      const reportsPath = path.join(__dirname, '../../docs/reports');
      const implementationReportPath = path.join(reportsPath, 'implementation-status.md');
      
      if (fs.existsSync(implementationReportPath)) {
        const reportContent = fs.readFileSync(implementationReportPath, 'utf8');
        implementationStatus.statusReport = reportContent;
        
        // Try to extract metrics from the report
        const todoCountMatch = reportContent.match(/Existing TODOs:\s*(\d+)/);
        const missingTodoMatch = reportContent.match(/Missing TODOs:\s*(\d+)/);
        
        if (todoCountMatch && todoCountMatch[1]) {
          implementationStatus.existingTodos = parseInt(todoCountMatch[1]);
        }
        
        if (missingTodoMatch && missingTodoMatch[1]) {
          implementationStatus.missingTodos = parseInt(missingTodoMatch[1]);
        }
      }
    } catch (err) {
      logger.warn('Error reading implementation status report', { error: err.message });
      debugLogger.error('Implementation report read error', {
        error: err.message,
        stack: err.stack
      });
    }
    
    // Log success
    logger.info('Implementation status retrieved successfully');
    debugLogger.debug('Implementation status data', { 
      totalIssues: implementationStatus.totalIssues,
      openIssues: implementationStatus.openIssues,
      modules: Object.keys(implementationStatus.byModule)
    });
    
    res.json({ success: true, implementationStatus });
  } catch (error) {
    // Enhanced error logging with detailed diagnostics
    const errorDetails = {
      endpoint: 'getImplementationStatus',
      message: error.message,
      status: error.status,
      response: error.response ? {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers
      } : null,
      tokenDiagnosis: tokenDiagnosis
    };
    
    logger.error(`Error getting implementation status: ${error.message}`);
    debugLogger.error('GitHub implementation status API error', errorDetails);
    
    // Return detailed error to help debugging
    res.status(error.status || 500).json({ 
      success: false, 
      error: error.message,
      tokenIssue: tokenDiagnosis ? tokenDiagnosis.description : null,
      resolution: tokenDiagnosis ? tokenDiagnosis.resolution : null
    });
  }
});

/**
 * Get pull requests from a GitHub repository
 */
app.post('/getPullRequests', async (req, res) => {
  try {
    const { state = 'open', sort = 'updated', limit = 10 } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    logger.info('Getting pull requests', { owner: config.owner, repo: config.repo, state, sort });
    
    const params = {
      owner: config.owner,
      repo: config.repo,
      state,
      sort,
      direction: 'desc',
      per_page: limit
    };
    
    const { data } = await octokit.pulls.list(params);
    
    // Format the response
    const pullRequests = data.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at,
      body: pr.body,
      user: {
        login: pr.user.login,
        avatar_url: pr.user.avatar_url
      },
      head: pr.head.ref,
      base: pr.base.ref,
      draft: pr.draft,
      mergeable: pr.mergeable
    }));
    
    res.json({ success: true, pullRequests });
  } catch (error) {
    logger.error('Error getting pull requests', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get a specific GitHub pull request by number
 */
app.post('/getPullRequest', async (req, res) => {
  try {
    const { prNumber } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!prNumber) {
      return res.status(400).json({ success: false, error: 'Pull request number is required' });
    }
    
    logger.info('Getting pull request', { owner: config.owner, repo: config.repo, prNumber });
    
    const { data } = await octokit.pulls.get({
      owner: config.owner,
      repo: config.repo,
      pull_number: prNumber
    });
    
    // Format the response
    const pullRequest = {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
      merged_at: data.merged_at,
      body: data.body,
      user: {
        login: data.user.login,
        avatar_url: data.user.avatar_url
      },
      head: data.head.ref,
      base: data.base.ref,
      draft: data.draft,
      mergeable: data.mergeable,
      mergeable_state: data.mergeable_state,
      labels: data.labels.map(label => label.name),
      requested_reviewers: data.requested_reviewers.map(reviewer => reviewer.login)
    };
    
    res.json({ success: true, pullRequest });
  } catch (error) {
    logger.error('Error getting pull request', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create a new GitHub pull request
 */
app.post('/createPullRequest', async (req, res) => {
  try {
    const { title, body, head, base = 'main', draft = false } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    
    if (!head) {
      return res.status(400).json({ success: false, error: 'Head branch is required' });
    }
    
    logger.info('Creating pull request', { owner: config.owner, repo: config.repo, title, head, base });
    
    const params = {
      owner: config.owner,
      repo: config.repo,
      title,
      body,
      head,
      base,
      draft
    };
    
    const { data } = await octokit.pulls.create(params);
    
    res.json({
      success: true,
      pullRequest: {
        number: data.number,
        title: data.title,
        url: data.html_url,
        state: data.state
      }
    });
  } catch (error) {
    logger.error('Error creating pull request', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get files changed in a pull request
 */
app.post('/getFilesChanged', async (req, res) => {
  try {
    const { prNumber } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!prNumber) {
      return res.status(400).json({ success: false, error: 'Pull request number is required' });
    }
    
    logger.info('Getting files changed', { owner: config.owner, repo: config.repo, prNumber });
    
    const { data } = await octokit.pulls.listFiles({
      owner: config.owner,
      repo: config.repo,
      pull_number: prNumber
    });
    
    // Format the response
    const files = data.map(file => ({
      filename: file.filename,
      status: file.status, // added, modified, removed
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch
    }));
    
    res.json({ success: true, files });
  } catch (error) {
    logger.error('Error getting files changed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 7867;
app.listen(PORT, () => {
  logger.info(`GitHub Issues MCP server running on port ${PORT}`);
});

// Export for testing
module.exports = app;