# GitHub Issues MCP Server for Claude Code

This server implements the Claude Code Model Context Protocol (MCP) interface for interacting with GitHub Issues. It allows Claude to directly query, create, and update GitHub issues during development sessions.

## Features

- Query GitHub issues by state, labels, or search terms
- Get detailed information about specific issues
- Create new issues with rich formatting
- Update existing issues (title, body, labels, assignees)
- Add comments to issues
- Get implementation status reports

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd mcp-servers/github-issues
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token and repository settings
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Configure Claude Code to use this MCP server:
   ```bash
   claude mcp add github-issues "node server.js" --cwd "/path/to/mcp-servers/github-issues"
   ```

3. Use GitHub issues directly from Claude Code:
   ```
   @github-issues getIssues --labels "implementation-gap"
   ```

## API Endpoints

### GET /capabilities
Returns the server's capabilities and parameter specifications.

### POST /getIssues
Get a list of issues from the repository.

Parameters:
- `state`: Issue state (open, closed, all). Default: open
- `labels`: Comma-separated list of label names (optional)
- `since`: ISO 8601 timestamp (optional)
- `limit`: Maximum number of issues to return. Default: 10

### POST /getIssue
Get a specific GitHub issue by number.

Parameters:
- `issueNumber`: The issue number

### POST /createIssue
Create a new GitHub issue.

Parameters:
- `title`: Issue title
- `body`: Issue body
- `labels`: Array of label names (optional)
- `assignees`: Array of assignee usernames (optional)

### POST /updateIssue
Update an existing GitHub issue.

Parameters:
- `issueNumber`: The issue number
- `title`: New issue title (optional)
- `body`: New issue body (optional)
- `state`: Issue state (open, closed) (optional)
- `labels`: New array of label names (optional)
- `assignees`: New array of assignee usernames (optional)

### POST /addComment
Add a comment to a GitHub issue.

Parameters:
- `issueNumber`: The issue number
- `body`: Comment body

### POST /getImplementationStatus
Get implementation status information.

## Example Usage from Claude Code

```
I'd like to check the status of our implementation issues.

@github-issues getIssues --labels "implementation-gap"
```

## Integration with DocGen

This MCP server integrates with the DocGen implementation tracking system to help monitor progress on implementation issues. It's part of a comprehensive approach to tracking implementation completeness as described in the [monitoring system documentation](../../docs/monitoring-system.md).

## Security Considerations

- The server requires a GitHub personal access token with `repo` scope
- Never commit your `.env` file with the token
- Consider running the server locally to prevent exposing your GitHub token
- Set up proper authentication if deploying in a shared environment

## Testing

Run the test suite:
```bash
npm test
```

## License

MIT