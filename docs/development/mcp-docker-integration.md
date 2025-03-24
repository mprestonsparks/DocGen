# MCP Docker Integration Guide

This guide explains how the Model Context Protocol (MCP) servers are integrated with Docker for cross-platform compatibility.

## Overview

The DocGen project uses MCP servers to provide advanced capabilities to Claude Code:

1. **GitHub MCP**: Provides access to GitHub issues, pull requests, and implementation status
2. **Coverage MCP**: Provides access to code coverage metrics and analysis

To ensure these services work reliably across all platforms (Windows, Mac, Linux) and within Docker containers, we've implemented a multi-layer architecture:

```
+------------------+        +----------------+        +----------------+        +----------------+
|                  |        |                |        |                |        |                |
|   Claude Code    | <----> |   MCP Proxy    | <----> |  MCP Adapter   | <----> |   REST API     |
|                  |        |                |        |                |        |                |
+------------------+        +----------------+        +----------------+        +----------------+
```

## Key Components

### 1. MCP Adapters (`mcp-adapter.cjs`)

These adapters translate between our existing REST API servers and the JSON-RPC 2.0 protocol required by Claude Code:

- `/mcp-servers/github-issues/mcp-adapter.cjs`: Adapter for GitHub services
- `/mcp-servers/coverage-analysis/mcp-adapter.cjs`: Adapter for coverage services

### 2. MCP Proxy (`mcp-proxy.cjs`)

This proxy handles stdio communication with Claude Code and forwards requests to the appropriate MCP adapter:

- `/scripts/mcp-proxy.cjs`: Handles incoming requests and formats responses

### 3. Docker Integration Scripts

The following scripts integrate MCP servers with Docker:

- `/scripts/docker-commands.ts`: Utilities for Docker operations including MCP management
- `/scripts/cross-platform.ts`: Cross-platform command execution with Docker support
- `/scripts/unix/get-to-work.sh` and `/scripts/windows/get-to-work.ps1`: Platform-specific entry points

### 4. Management Scripts

- `/mcp-servers/start-mcp-adapters.sh`: Start, stop, or restart MCP adapters
- `/mcp-servers/start-mcp-servers.sh`: Start, stop, or restart the underlying REST API servers

## How It Works

1. When the user runs the `get-to-work` script, it:
   - Checks if MCP servers are running
   - Starts the MCP servers if needed
   - Starts the Docker container if needed
   - Executes the requested command within Docker

2. Within Docker:
   - MCP adapters run on specific ports (GitHub: 7866, Coverage: 7865)
   - REST API servers run on different ports (GitHub: 7867, Coverage: 7868)
   - The MCP proxy is configured to communicate with Claude Code

3. Claude Code:
   - Connects to the MCP proxy using the stdio protocol
   - Sends JSON-RPC 2.0 requests to the proxy
   - Receives properly formatted JSON-RPC 2.0 responses

## Usage

### Start MCP Servers

```bash
# Unix
npx ts-node scripts/cross-platform.ts mcp start

# Windows
npx ts-node scripts\cross-platform.ts mcp start
```

### Check MCP Servers Status

```bash
# Unix
npx ts-node scripts/cross-platform.ts mcp check

# Windows
npx ts-node scripts\cross-platform.ts mcp check
```

### Stop MCP Servers

```bash
# Unix
npx ts-node scripts/cross-platform.ts mcp stop

# Windows
npx ts-node scripts\cross-platform.ts mcp stop
```

### Testing MCP Services in Claude Code

Once the servers are running, you can use these commands in Claude Code:

```
@github getIssues --labels "implementation-gap"
@coverage getCoverageMetrics
```

## Troubleshooting

If you encounter issues with MCP servers in Docker:

1. **Check server status**: Run `npx ts-node scripts/cross-platform.ts mcp check`
2. **Restart servers**: Run `npx ts-node scripts/cross-platform.ts mcp restart`
3. **Check logs**: 
   - GitHub MCP: `/logs/mcp-debug/github-mcp-adapter-output.log`
   - Coverage MCP: `/logs/mcp-debug/coverage-mcp-adapter-output.log`
   - MCP Adapters: `/logs/mcp-debug/mcp-adapters-startup.log`

4. **Port conflicts**: Make sure ports 7865-7868 are not being used by other applications.

5. **Docker Port Mappings**: Ensure Docker is configured to expose the MCP ports:

   Check if ports are properly published:
   ```bash
   docker port docker-docgen-1
   ```
   
   You should see the following ports mapped:
   - 7865/tcp -> 0.0.0.0:7865 (Coverage MCP)
   - 7866/tcp -> 0.0.0.0:7866 (GitHub MCP)
   - 7867/tcp -> 0.0.0.0:7867 (Coverage REST API)
   - 7868/tcp -> 0.0.0.0:7868 (GitHub REST API)
   
   If these ports are not exposed, modify your docker-compose.yml file to include:
   ```yaml
   ports:
     - "7865:7865"
     - "7866:7866"
     - "7867:7867"
     - "7868:7868"
   ```

6. **Network Connectivity**: Use the debug utility to verify network connectivity:
   ```bash
   docker exec docker-docgen-1 node /app/mcp-servers/docker-debug.js
   ```

7. **Environment Detection**: If Claude Code can't connect to MCP servers:
   - Check that `.mcp-in-docker` flag file exists in project root
   - Ensure environment variable `MCP_IN_DOCKER=1` is set
   - Verify the host is correctly detected in the MCP server manager
   
   You can check the detection logic by running:
   ```bash
   docker exec docker-docgen-1 node -e "console.log(require('/app/scripts/core/mcp-server-manager.cjs'))"
   ```

## Implementation Details

### JSON-RPC 2.0 Protocol

MCP uses the JSON-RPC 2.0 protocol with this format:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "methodName",
  "params": { "param1": "value1" }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "key": "value" }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Error message",
    "data": { "details": "Additional information" }
  }
}
```

### Docker Environment Variables

When running in Docker, the following environment variables are available:

- `GITHUB_MCP_URL`: URL for the GitHub MCP adapter (default: `http://localhost:7866`)
- `COVERAGE_MCP_URL`: URL for the Coverage MCP adapter (default: `http://localhost:7865`)
- `MCP_SERVER_PORT`: Base port for the REST API servers (default: `7867`)

## Extending MCP Services

To add new methods to an existing MCP service:

1. Add the method to the appropriate REST API server
2. Update the method mappings in the corresponding MCP adapter
3. Test the new method with the MCP test script

For example, to add a new GitHub method:

```javascript
// In mcp-servers/github-issues/mcp-adapter.cjs
const methodMappings = {
  // Existing methods...
  'github.newMethod': { endpoint: '/newMethod', method: 'POST' }
};
```