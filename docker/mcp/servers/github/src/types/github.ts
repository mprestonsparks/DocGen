/**
 * Type definitions for GitHub MCP Server
 */

/**
 * GitHub repository information
 */
export interface RepositoryInfo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GitHub issue
 */
export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  labels: string[];
}

/**
 * GitHub pull request
 */
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  draft: boolean;
  mergeable: boolean | null;
  baseBranch: string;
  headBranch: string;
}

/**
 * GitHub client status
 */
export interface GitHubClientStatus {
  status: 'ok' | 'error' | 'warning';
  message: string;
  rateLimitRemaining?: string;
  rateLimitReset?: string;
}

/**
 * MCP request format
 */
export interface MCPRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, any>;
  id: string | number;
}

/**
 * MCP response format
 */
export interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}
