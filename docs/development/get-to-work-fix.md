# Get-to-Work Script Fixes

## Issues Identified

### 1. GitHub Authentication Issue
The MCP server is failing to authenticate with GitHub due to an invalid or expired token. The error message "Bad credentials" appears in the log files.

### 2. TypeScript Execution Error
When trying to run the `validate-todos.ts` script, there's an error: `Unknown file extension ".ts" for /Users/preston/Documents/gitRepos/DocGen/scripts/validate-todos.ts`

## Solutions

### GitHub Authentication Fix
1. Replace the fine-grained PAT in `.env` with a classic GitHub token:
   ```
   # GitHub API Token (with repo scope)
   GITHUB_TOKEN=ghp_your_new_classic_token_with_repo_scope
   ```

2. Generate a new classic token with repo scope from:
   https://github.com/settings/tokens

3. See detailed instructions in `github-authentication-fix.md`

### Script Execution Issues

The `validate-todos.ts` script execution error is due to a misconfiguration in Node.js trying to run a TypeScript file directly. The solution is to use the npm script that properly uses ts-node:

```bash
# Instead of running directly
npm run validate-todos -- --json
```

## Using the get-to-work.sh Script

Now that you've fixed these issues, you can properly use the script by running:

```bash
bash get-to-work.sh
```

Or make it executable and run directly:

```bash
chmod +x get-to-work.sh
./get-to-work.sh
```

The script will:
1. Check for failing tests (all pass now)
2. Start the MCP servers
3. Find the next GitHub issues to work on
4. Provide guidance through the Claude Workflow Manager

## Test Script Integration

I've also verified that the script correctly looks for and uses the test status to determine the next actions. All tests are currently passing, so the workflow will focus on suggesting the next GitHub issues to work on.

## Additional Improvements (Optional)
1. Add a `--debug` flag to the get-to-work.sh script to show more verbose output
2. Create a simple wrapper for the validate-todos script to handle the TypeScript execution properly
3. Add error handling for cases where GitHub credentials are not properly configured