/**
 * MCP (Model Context Protocol) route for GitHub MCP Server
 */

import { Router, Request, Response } from 'express';
import { logger, logError } from '../utils/logger';
import { 
  getRepositoryInfo, 
  listIssues, 
  getPullRequests,
  createIssue,
  createPullRequest,
  getPullRequest,
  mergePullRequest,
  getPullRequestReviews,
  createPullRequestReview,
  analyzeIssueDependencies,
  prioritizeIssues,
  createIssuesFromTODOs,
  updateIssueStatus,
  addIssueComment
} from '../services/github';

export const mcpRouter = Router();

/**
 * POST /mcp
 * Main MCP endpoint that handles JSON-RPC style requests
 */
mcpRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { method, params, id } = req.body;
    
    logger.info(`MCP request received: ${method}`, { id });
    
    // Validate request format
    if (!method || !id) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        },
        id: id || null
      });
    }
    
    // Process request based on method
    let result;
    
    switch (method) {
      case 'github.repository.info':
        result = await getRepositoryInfo(params?.owner, params?.repo);
        break;
        
      case 'github.issues.list':
        result = await listIssues(params?.owner, params?.repo, params?.state);
        break;
        
      case 'github.pullRequests.list':
        result = await getPullRequests(params?.owner, params?.repo, params?.state);
        break;
        
      case 'github.issues.create':
        result = await createIssue(
          params?.owner, 
          params?.repo, 
          params?.title, 
          params?.body, 
          params?.labels
        );
        break;
        
      case 'github.pullRequests.create':
        result = await createPullRequest(
          params?.owner,
          params?.repo,
          params?.title,
          params?.body,
          params?.head,
          params?.base,
          params?.draft
        );
        break;
        
      case 'github.pullRequests.get':
        result = await getPullRequest(
          params?.owner,
          params?.repo,
          params?.pullNumber
        );
        break;
        
      case 'github.pullRequests.merge':
        result = await mergePullRequest(
          params?.owner,
          params?.repo,
          params?.pullNumber,
          params?.commitTitle,
          params?.commitMessage,
          params?.mergeMethod
        );
        break;
        
      case 'github.pullRequests.getReviews':
        result = await getPullRequestReviews(
          params?.owner,
          params?.repo,
          params?.pullNumber
        );
        break;
        
      case 'github.pullRequests.createReview':
        result = await createPullRequestReview(
          params?.owner,
          params?.repo,
          params?.pullNumber,
          params?.body,
          params?.event
        );
        break;
        
      // New methods for get-to-work workflow
      case 'github.issues.analyzeDependencies':
        result = await analyzeIssueDependencies(
          params?.owner,
          params?.repo,
          params?.issues
        );
        break;
        
      case 'github.issues.prioritize':
        result = await prioritizeIssues(
          params?.owner,
          params?.repo,
          params?.dependencies,
          params?.issues
        );
        break;
        
      case 'github.issues.createFromTODOs':
        result = await createIssuesFromTODOs(
          params?.owner,
          params?.repo,
          params?.todos
        );
        break;
        
      case 'github.issues.updateStatus':
        result = await updateIssueStatus(
          params?.owner,
          params?.repo,
          params?.issueNumber,
          params?.state
        );
        break;
        
      case 'github.issues.addComment':
        result = await addIssueComment(
          params?.owner,
          params?.repo,
          params?.issueNumber,
          params?.body
        );
        break;
        
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found'
          },
          id
        });
    }
    
    // Return successful response
    return res.json({
      jsonrpc: '2.0',
      result,
      id
    });
    
  } catch (error) {
    // Log the error
    logError('MCP request failed', error as Error);
    
    // Return error response
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      id: req.body.id || null
    });
  }
});

/**
 * GET /mcp/capabilities
 * Returns the capabilities of this MCP server
 */
mcpRouter.get('/capabilities', (req: Request, res: Response) => {
  const capabilities = {
    github_repository_access: {
      version: '1.0',
      methods: ['github.repository.info']
    },
    github_issue_tracking: {
      version: '1.1',
      methods: [
        'github.issues.list', 
        'github.issues.create',
        'github.issues.analyzeDependencies',
        'github.issues.prioritize',
        'github.issues.createFromTODOs',
        'github.issues.updateStatus',
        'github.issues.addComment'
      ]
    },
    github_pull_requests: {
      version: '1.1',
      methods: [
        'github.pullRequests.list',
        'github.pullRequests.get',
        'github.pullRequests.create',
        'github.pullRequests.merge',
        'github.pullRequests.getReviews',
        'github.pullRequests.createReview'
      ]
    },
    get_to_work_workflow: {
      version: '1.0',
      methods: [
        'github.issues.analyzeDependencies',
        'github.issues.prioritize',
        'github.issues.createFromTODOs'
      ]
    }
  };
  
  return res.json(capabilities);
});
