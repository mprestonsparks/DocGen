/**
 * GitHub service for MCP Server
 * Handles interactions with the GitHub API
 */

import { Octokit } from 'octokit';
import fs from 'fs';
import { logger, logError } from '../utils/logger';
import { 
  RepositoryInfo, 
  Issue, 
  PullRequest, 
  GitHubClientStatus 
} from '../types/github';

// GitHub client instance
let octokit: Octokit | null = null;

/**
 * Initialize the GitHub API client
 */
export const setupGitHubClient = (): void => {
  try {
    // Read GitHub token from Docker secret
    const tokenPath = '/run/secrets/github_token';
    let token: string;
    
    if (fs.existsSync(tokenPath)) {
      token = fs.readFileSync(tokenPath, 'utf8').trim();
    } else {
      // Fallback to environment variable
      token = process.env.GITHUB_TOKEN || '';
    }
    
    if (!token) {
      throw new Error('GitHub token not found');
    }
    
    // Create Octokit instance
    octokit = new Octokit({ auth: token });
    logger.info('GitHub client initialized successfully');
  } catch (error) {
    logError('Failed to initialize GitHub client', error as Error);
    throw error;
  }
};

/**
 * Get GitHub client status
 */
export const getGitHubClientStatus = async (): Promise<GitHubClientStatus> => {
  try {
    if (!octokit) {
      return {
        status: 'error',
        message: 'GitHub client not initialized'
      };
    }
    
    // Test GitHub API connection
    const response = await octokit.rest.meta.getZen();
    
    return {
      status: 'ok',
      message: 'GitHub API connection successful',
      rateLimitRemaining: response.headers['x-ratelimit-remaining'],
      rateLimitReset: response.headers['x-ratelimit-reset']
    };
  } catch (error) {
    logError('GitHub API connection test failed', error as Error);
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get repository information
 */
export const getRepositoryInfo = async (
  owner: string, 
  repo: string
): Promise<RepositoryInfo> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    const response = await octokit.rest.repos.get({
      owner,
      repo
    });
    
    return {
      id: response.data.id,
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description,
      url: response.data.html_url,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      openIssues: response.data.open_issues_count,
      defaultBranch: response.data.default_branch,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };
  } catch (error) {
    logError(`Failed to get repository info for ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * List issues for a repository
 */
export const listIssues = async (
  owner: string, 
  repo: string, 
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<Issue[]> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    const response = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state
    });
    
    return response.data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: issue.state,
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      labels: issue.labels.map(label => 
        typeof label === 'string' ? label : (label.name || '')
      ).filter(Boolean) as string[]
    }));
  } catch (error) {
    logError(`Failed to list issues for ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Get pull requests for a repository
 */
export const getPullRequests = async (
  owner: string, 
  repo: string, 
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<PullRequest[]> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state
    });
    
    return response.data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.state,
      url: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
      draft: pr.draft || false,
      mergeable: null, // Set to null as we can't reliably determine this from the list API
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref
    }));
  } catch (error) {
    logError(`Failed to get pull requests for ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Create an issue in a repository
 */
export const createIssue = async (
  owner: string, 
  repo: string, 
  title: string, 
  body: string, 
  labels?: string[]
): Promise<Issue> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo || !title) {
      throw new Error('Owner, repo, and title parameters are required');
    }
    
    const response = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels
    });
    
    return {
      id: response.data.id,
      number: response.data.number,
      title: response.data.title,
      body: response.data.body || null,
      state: response.data.state,
      url: response.data.html_url,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
      closedAt: response.data.closed_at,
      labels: response.data.labels.map(label => 
        typeof label === 'string' ? label : (label.name || '')
      ).filter(Boolean) as string[]
    };
  } catch (error) {
    logError(`Failed to create issue in ${owner}/${repo}`, error as Error);
    throw error;
  }
};
