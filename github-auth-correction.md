# GitHub Authentication Issue Correction

## Problem Identified
The GitHub MCP server is failing with "Bad credentials" errors when trying to access the GitHub API.

## Root Cause
The `.env` file contained a placeholder token value rather than an actual valid GitHub personal access token:
```
GITHUB_TOKEN=ghp_REPLACE_WITH_YOUR_CLASSIC_PAT_WITH_REPO_SCOPE
```

This is clearly a placeholder instruction and not a valid token, which is why GitHub API calls were failing with "Bad credentials" errors.

## Solution
Replace the placeholder text with your actual GitHub personal access token in the `.env` file:

```
GITHUB_TOKEN=your_actual_github_token_here
```

### GitHub Token Requirements
- Must be a valid GitHub personal access token with the 'repo' scope
- Can be generated at https://github.com/settings/tokens
- The token should have access to the repository specified in the `.env` file:
  ```
  GITHUB_OWNER=mprestonsparks
  GITHUB_REPO=DocGen
  ```

## TypeScript Execution Error
The secondary issue involves the script execution of `validate-todos.ts`. This error occurs because Node.js is trying to run the TypeScript file directly without ts-node:

```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for /Users/preston/Documents/gitRepos/DocGen/scripts/validate-todos.ts
```

### Solution for TypeScript Execution
Use the npm script that properly invokes ts-node:
```bash
npm run validate-todos -- --json
```

Rather than trying to execute the TypeScript file directly.

## Verification
After updating the token:
1. Restart the MCP servers
2. Run the get-to-work.sh script again
3. The GitHub API calls should now succeed, and you'll see GitHub issues in the output