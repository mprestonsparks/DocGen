# MCP Server Troubleshooting Guide

This guide addresses common issues with the DocGen MCP servers and provides solutions.

## GitHub Issues MCP

### "Bad credentials" Error

**Problem**: When using the GitHub Issues MCP, you receive "Bad credentials" errors.

**Causes**:
1. Invalid or expired GitHub Personal Access Token (PAT)
2. Token has incorrect permissions
3. Token format issues (whitespace, newlines, etc.)
4. Repository access issues

**Solutions**:

1. **Verify token validity**
   ```bash
   cd github-issues
   node pat-test.cjs
   ```

2. **Check token format**
   - Ensure there are no extra spaces or newlines
   - Verify the token starts with appropriate prefix (e.g., `ghp_`)
   - Check token length (should be approximately 40-80 characters)

3. **Regenerate token**
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens
   - Generate a new token with the `repo` scope at minimum
   - Copy the entire token directly to `.env` file:
   ```
   GITHUB_TOKEN=your_new_token_here
   ```

4. **Demo mode fallback**
   - Even without a valid token, the MCP servers now support a fallback demo mode
   - This provides mock data rather than real GitHub data
   - This allows you to continue testing workflows without GitHub integration

## Coverage Analysis MCP

### Missing Coverage Data Error

**Problem**: The Coverage Analysis MCP cannot find coverage data.

**Solutions**:

1. **Generate coverage data**
   ```bash
   npm test -- --coverage
   ```

2. **Use the built-in mock coverage generator**
   ```bash
   cd coverage-analysis
   node generate-mock-coverage.js
   ```

3. **Verify coverage path**
   - Check `.env` file in coverage-analysis directory
   - Default path is `coverage/coverage-final.json`

### GitHub Integration Issues

For correlation between coverage and GitHub issues, follow the GitHub token troubleshooting above.

## Starting and Managing MCP Servers

### Server Startup Issues

**Problem**: Servers fail to start or respond with errors.

**Solutions**:

1. **Check for existing running servers**
   ```bash
   ps aux | grep "node server.js"
   ```
   Kill any existing processes:
   ```bash
   pkill -f "node.*server.js"
   ```

2. **Verify port availability**
   - GitHub MCP: port 7867
   - Coverage MCP: port 7868
   ```bash
   lsof -i :7867
   lsof -i :7868
   ```

3. **Restart the servers**
   ```bash
   ./start-mcp-servers.sh
   ```

### Configuring Claude Code to Use MCP Servers

**Problem**: Claude isn't connecting to MCP servers.

**Solutions**:

1. **Check MCP status**
   ```bash
   claude mcp status
   ```

2. **Remove and re-add MCP server configuration**
   ```bash
   claude mcp remove github
   claude mcp add github http://localhost:7867
   claude mcp remove coverage
   claude mcp add coverage http://localhost:7868
   ```

3. **Verify connectivity**
   ```bash
   curl http://localhost:7867/capabilities
   curl http://localhost:7868/capabilities
   ```

## Full Reset Procedure

If all else fails, perform a full reset:

1. Stop all running servers:
   ```bash
   pkill -f "node.*server.js"
   ```

2. Clear MCP configuration:
   ```bash
   claude mcp remove github
   claude mcp remove coverage
   ```

3. Regenerate GitHub token (see GitHub Issues MCP section)

4. Update .env files with new token

5. Generate fresh coverage data:
   ```bash
   npm test -- --coverage
   ```

6. Restart servers:
   ```bash
   ./start-mcp-servers.sh
   ```

7. Verify configuration:
   ```bash
   claude mcp status
   ```