# GitHub Authentication Issue Resolution

## Problem Identified
The MCP server for GitHub integration is failing with "Bad credentials" errors when attempting to make API calls to GitHub.

## Root Cause
The GitHub token in the `.env` file is a fine-grained Personal Access Token (PAT) that starts with `github_pat_`. This newer type of token allows very granular permission settings, but may not have been granted all the necessary permissions for the operations our server is attempting.

## Required Permissions
The GitHub MCP server uses the [Octokit REST API](https://octokit.github.io/rest.js/v18/) which requires specific permissions depending on the operations performed:

1. `repo` scope - For accessing repository data including issues, PRs, etc.
2. `issues` scope - For managing issues (if using fine-grained PAT)
3. `pull_requests` scope - For managing PRs (if using fine-grained PAT)

## Solution
Replace the fine-grained PAT with a Classic Personal Access Token that has the full `repo` scope. 

### Steps to Generate a New Token

1. Visit [GitHub Personal Access Tokens settings](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Provide a descriptive note (e.g., "DocGen MCP Server")
4. Select the "repo" scope (this will include all repository permissions)
5. Click "Generate token"
6. Copy the generated token (starts with `ghp_`)

### Update Configuration
Replace the token in the `.env` file with the new classic PAT:

```
GITHUB_TOKEN=ghp_your_new_token_here
```

## Verification
After updating the token:

1. Restart the MCP servers using the `start-mcp-servers.sh` script
2. Run `get-to-work.sh` again
3. The GitHub API calls should now succeed

## Security Considerations
The classic PAT with repo scope grants broad repository access. In a production environment, consider:

1. Using GitHub Apps instead of PATs for better security
2. Configuring more granular permissions if using fine-grained PATs
3. Rotating tokens regularly
4. Using environment-specific tokens