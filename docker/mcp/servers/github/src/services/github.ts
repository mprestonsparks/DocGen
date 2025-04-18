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

/**
 * Create a pull request in a repository
 */
export const createPullRequest = async (
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  draft: boolean = false
): Promise<PullRequest> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo || !title || !head || !base) {
      throw new Error('Owner, repo, title, head, and base parameters are required');
    }
    
    const response = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
      draft
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
      mergedAt: response.data.merged_at,
      draft: response.data.draft || false,
      mergeable: response.data.mergeable || null,
      baseBranch: response.data.base.ref,
      headBranch: response.data.head.ref
    };
  } catch (error) {
    logError(`Failed to create pull request in ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Get a specific pull request
 */
export const getPullRequest = async (
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequest> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo || !pullNumber) {
      throw new Error('Owner, repo, and pullNumber parameters are required');
    }
    
    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber
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
      mergedAt: response.data.merged_at,
      draft: response.data.draft || false,
      mergeable: response.data.mergeable || null,
      baseBranch: response.data.base.ref,
      headBranch: response.data.head.ref
    };
  } catch (error) {
    logError(`Failed to get pull request ${pullNumber} in ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Merge a pull request
 */
export const mergePullRequest = async (
  owner: string,
  repo: string,
  pullNumber: number,
  commitTitle?: string,
  commitMessage?: string,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
): Promise<{ merged: boolean, message: string }> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo || !pullNumber) {
      throw new Error('Owner, repo, and pullNumber parameters are required');
    }
    
    const response = await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      commit_title: commitTitle,
      commit_message: commitMessage,
      merge_method: mergeMethod
    });
    
    return {
      merged: response.data.merged,
      message: response.data.message
    };
  } catch (error) {
    logError(`Failed to merge pull request ${pullNumber} in ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Get pull request reviews
 */
export const getPullRequestReviews = async (
  owner: string,
  repo: string,
  pullNumber: number
): Promise<Array<{
  id: number,
  user: string,
  state: string,
  body: string | null,
  submittedAt: string
}>> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo || !pullNumber) {
      throw new Error('Owner, repo, and pullNumber parameters are required');
    }
    
    const response = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber
    });
    
    return response.data.map(review => ({
      id: review.id,
      user: review.user?.login || 'unknown',
      state: review.state,
      body: review.body || null,
      submittedAt: review.submitted_at || new Date().toISOString()
    }));
  } catch (error) {
    logError(`Failed to get reviews for pull request ${pullNumber} in ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Create a review for a pull request
 */
export const createPullRequestReview = async (
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT'
): Promise<{ id: number, state: string }> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo || !pullNumber) {
      throw new Error('Owner, repo, and pullNumber parameters are required');
    }
    
    const response = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      event
    });
    
    return {
      id: response.data.id,
      state: response.data.state
    };
  } catch (error) {
    logError(`Failed to create review for pull request ${pullNumber} in ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Analyze dependencies between issues
 */
export const analyzeIssueDependencies = async (
  owner: string,
  repo: string,
  issues?: Issue[]
): Promise<Record<number, number[]>> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    // If issues are not provided, fetch them
    const issueList = issues || await listIssues(owner, repo, 'open');
    
    // Create a map of issue numbers to dependencies
    const dependencies: Record<number, number[]> = {};
    
    // Process each issue to find dependencies
    for (const issue of issueList) {
      dependencies[issue.number] = [];
      
      // Look for mentions of other issues in the body
      if (issue.body) {
        // Match patterns like #123 or "depends on #123" or "blocked by #123"
        const regex = /#(\d+)/g;
        const matches = [...issue.body.matchAll(regex)];
        
        for (const match of matches) {
          const dependencyNumber = parseInt(match[1], 10);
          
          // Check if this is a valid issue number and not the same issue
          if (
            !isNaN(dependencyNumber) && 
            dependencyNumber !== issue.number &&
            issueList.some(i => i.number === dependencyNumber)
          ) {
            dependencies[issue.number].push(dependencyNumber);
          }
        }
      }
    }
    
    return dependencies;
  } catch (error) {
    logError(`Failed to analyze issue dependencies for ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Prioritize issues based on dependencies
 */
export const prioritizeIssues = async (
  owner: string,
  repo: string,
  dependencies?: Record<number, number[]>,
  issues?: Issue[]
): Promise<number[]> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    // If issues are not provided, fetch them
    const issueList = issues || await listIssues(owner, repo, 'open');
    
    // If dependencies are not provided, analyze them
    const issueDependencies = dependencies || await analyzeIssueDependencies(owner, repo, issueList);
    
    // Create a map of issue numbers to their objects for easy lookup
    const issueMap = new Map(issueList.map(issue => [issue.number, issue]));
    
    // Create a priority queue based on topological sort
    const prioritized: number[] = [];
    const visited = new Set<number>();
    const visiting = new Set<number>();
    
    // Depth-first search to create topological sort
    const visit = (issueNumber: number): void => {
      if (visited.has(issueNumber)) return;
      if (visiting.has(issueNumber)) {
        // Circular dependency detected, break the cycle
        logger.warn(`Circular dependency detected for issue #${issueNumber}`);
        return;
      }
      
      visiting.add(issueNumber);
      
      // Visit all dependencies first
      const deps = issueDependencies[issueNumber] || [];
      for (const dep of deps) {
        visit(dep);
      }
      
      visiting.delete(issueNumber);
      visited.add(issueNumber);
      prioritized.push(issueNumber);
    };
    
    // Visit all issues
    for (const issue of issueList) {
      if (!visited.has(issue.number)) {
        visit(issue.number);
      }
    }
    
    // Reverse the result to get the correct order (dependencies first)
    return prioritized.reverse();
  } catch (error) {
    logError(`Failed to prioritize issues for ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Create GitHub issues from TODO comments
 */
export const createIssuesFromTODOs = async (
  owner: string,
  repo: string,
  todos: Array<{
    file: string;
    line: number;
    text: string;
    category?: string;
  }>
): Promise<Issue[]> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    if (!todos || todos.length === 0) {
      return [];
    }
    
    // Group TODOs by category
    const todosByCategory: Record<string, typeof todos> = {};
    
    for (const todo of todos) {
      const category = todo.category || 'general';
      if (!todosByCategory[category]) {
        todosByCategory[category] = [];
      }
      todosByCategory[category].push(todo);
    }
    
    // Create issues for each category
    const createdIssues: Issue[] = [];
    
    for (const [category, categoryTodos] of Object.entries(todosByCategory)) {
      // Skip if no TODOs in this category
      if (categoryTodos.length === 0) continue;
      
      // Create issue title based on category
      const title = `TODO: ${category.charAt(0).toUpperCase() + category.slice(1)} tasks`;
      
      // Create issue body with all TODOs in this category
      const body = `
## TODOs found in codebase (${categoryTodos.length})

${categoryTodos.map(todo => (
  `- [ ] ${todo.text.replace(/^TODO:?\s*/i, '')} (${todo.file}:${todo.line})`
)).join('\n')}

---
*This issue was automatically generated from TODO comments in the codebase.*
      `.trim();
      
      // Create the issue
      const issue = await createIssue(
        owner,
        repo,
        title,
        body,
        [category, 'todo']
      );
      
      createdIssues.push(issue);
    }
    
    return createdIssues;
  } catch (error) {
    logError(`Failed to create issues from TODOs for ${owner}/${repo}`, error as Error);
    throw error;
  }
};

/**
 * Update issue status
 */
export const updateIssueStatus = async (
  owner: string,
  repo: string,
  issueNumber: number,
  state: 'open' | 'closed'
): Promise<Issue> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    if (!issueNumber) {
      throw new Error('Issue number is required');
    }
    
    const response = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state
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
    logError(`Failed to update issue status for ${owner}/${repo}#${issueNumber}`, error as Error);
    throw error;
  }
};

/**
 * Add comment to an issue
 */
export const addIssueComment = async (
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<{ id: number; url: string }> => {
  try {
    if (!octokit) {
      throw new Error('GitHub client not initialized');
    }
    
    if (!owner || !repo) {
      throw new Error('Owner and repo parameters are required');
    }
    
    if (!issueNumber) {
      throw new Error('Issue number is required');
    }
    
    if (!body) {
      throw new Error('Comment body is required');
    }
    
    const response = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
    
    return {
      id: response.data.id,
      url: response.data.html_url
    };
  } catch (error) {
    logError(`Failed to add comment to issue ${owner}/${repo}#${issueNumber}`, error as Error);
    throw error;
  }
};
