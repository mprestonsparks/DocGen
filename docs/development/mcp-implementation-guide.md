# Model Context Protocol (MCP) Implementation Guide

## Overview

This guide explains how we implemented the Model Context Protocol (MCP) servers to enable Claude Code to interact with custom capabilities:

1. GitHub Issues Management
2. Coverage Analysis

## Architecture

Our MCP implementation follows a three-tier architecture:

```
Claude Code <--> MCP Proxy <--> MCP Adapter <--> REST API Server
```

### Components

1. **REST API Servers**: Our original servers implementing functionality for GitHub issues and coverage analysis
   - GitHub Issues Server: Port 7867
   - Coverage Analysis Server: Port 7868

2. **MCP Adapters**: Implementing JSON-RPC 2.0 protocol compliant with Claude Code's requirements
   - GitHub MCP Adapter: Port 7866
   - Coverage MCP Adapter: Port 7865

3. **MCP Proxy**: Node.js script that handles stdio communication between Claude Code and our MCP adapters
   - Translates stdio requests to HTTP calls
   - Ensures protocol compliance
   - Provides detailed logging

## Protocol Requirements

Claude Code MCP integration requires:

1. JSON-RPC 2.0 protocol implementation
2. `initialize` method with mandatory `protocolVersion` parameter (value: "2024-11-05")
3. Server capabilities description in a specific format
4. Proper error handling according to JSON-RPC specification

## Implementation Files

- `/mcp-servers/github-issues/mcp-adapter.cjs`: GitHub MCP adapter
- `/mcp-servers/coverage-analysis/mcp-adapter.cjs`: Coverage MCP adapter
- `/scripts/mcp-proxy.cjs`: Node.js proxy for communication
- `/mcp-servers/start-mcp-adapters.sh`: Script to start/stop adapters
- `/mcp-servers/start-mcp-servers.sh`: Script to start the original REST API servers

## Setup and Usage

### Starting the MCP Services

1. Start the REST API servers:
```bash
./mcp-servers/start-mcp-servers.sh
```

2. Start the MCP adapters:
```bash
./mcp-servers/start-mcp-adapters.sh
```

3. Verify both are running with the test script:
```bash
node ./scripts/mcp-test.cjs
```

### Configuring Claude Code

The `start-mcp-adapters.sh` script automatically configures Claude Code using:

```bash
claude mcp add-json github '{"type":"stdio","command":"node","args":["/path/to/scripts/mcp-proxy.cjs","http://localhost:7866"]}' --scope user

claude mcp add-json coverage '{"type":"stdio","command":"node","args":["/path/to/scripts/mcp-proxy.cjs","http://localhost:7865"]}' --scope user
```

## Using MCP in Claude Code

Once configured, you can use the MCP capabilities directly in Claude Code:

```
@github getIssues --labels "implementation-gap"
@coverage getCoverageMetrics
```

## Available Methods

### GitHub MCP Methods

- `github.getIssues`: Get issues from a GitHub repository
- `github.getIssue`: Get a specific GitHub issue by number
- `github.createIssue`: Create a new GitHub issue
- `github.updateIssue`: Update an existing GitHub issue
- `github.addComment`: Add a comment to a GitHub issue
- `github.getImplementationStatus`: Get implementation status information
- `github.getPullRequests`: Get pull requests from a GitHub repository
- `github.getPullRequest`: Get a specific GitHub pull request by number
- `github.createPullRequest`: Create a new GitHub pull request
- `github.getFilesChanged`: Get files changed in a pull request

### Coverage MCP Methods

- `coverage.getCoverageMetrics`: Get overall coverage metrics
- `coverage.getFileCoverage`: Get coverage metrics for a specific file
- `coverage.generateCoverageReport`: Generate a coverage report in markdown format
- `coverage.analyzeIssueImpact`: Analyze which files are impacted by an issue
- `coverage.getCoverageHistory`: Get coverage metrics history
- `coverage.getImplementationGaps`: Identify files with implementation gaps
- `coverage.correlateIssuesWithCoverage`: Correlate GitHub issues with coverage metrics

## Debugging

Debug logs are stored in:

- MCP adapter logs: `/logs/mcp-debug/github-mcp-adapter.log` and `/logs/mcp-debug/coverage-mcp-adapter.log`
- MCP adapter startup: `/logs/mcp-debug/mcp-adapters-startup.log`
- REST API server logs: `/logs/mcp-debug/github-mcp-output.log` and `/logs/mcp-debug/coverage-mcp-output.log`
- MCP proxy logs: `/tmp/claude-mcp-proxy-[timestamp].log`

## Implementation Notes

1. The JSON-RPC 2.0 protocol requires specific format for requests and responses:
   - Request: `{"jsonrpc": "2.0", "id": <id>, "method": <method>, "params": <params>}`
   - Response: `{"jsonrpc": "2.0", "id": <id>, "result": <result>}` or `{"jsonrpc": "2.0", "id": <id>, "error": {code, message, data}}`

2. Claude Code requires specific error format for validation failures:
   ```json
   {
     "code": -32602,
     "message": "Invalid params: protocolVersion is required",
     "data": {
       "errors": [
         {
           "code": "invalid_type",
           "expected": "string",
           "received": "undefined",
           "path": ["protocolVersion"],
           "message": "Required"
         }
       ]
     }
   }
   ```

3. Claude Code uses Node.js `stdio` interface for MCP communication, which allows:
   - Reading JSON-RPC requests from stdin
   - Writing JSON-RPC responses to stdout

4. The MCP proxy must handle connection failures gracefully and provide detailed logs for troubleshooting.

5. The MCP adapters must properly translate between JSON-RPC and our REST API semantics.

## Security Considerations

1. All connections are local (localhost) for security
2. GitHub token is stored in a `.env` file and validated during server startup
3. Error responses avoid leaking sensitive information
4. MCP adapters do not expose underlying implementation details

## Future Improvements

1. Add additional MCP capabilities:
   - Code Quality Analysis
   - Documentation Generation
2. Implement authentication for MCP adapters
3. Add more comprehensive logging and monitoring
4. Create a unified MCP admin dashboard
5. Support distributed MCP servers (not just localhost)