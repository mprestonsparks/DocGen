# Cross-Platform Usage for DocGen

## Overview

DocGen works seamlessly across Windows, macOS, and Linux. This guide explains how to use DocGen on different platforms.

## Quick Start

```bash
# Get started with DocGen (all platforms)
npm run get-to-work:simple

# Show available commands
npm run help

# Run the interactive version (Unix only)
npm run get-to-work
```

## Platform-Specific Usage

### macOS and Linux

Native shell scripts provide the best experience:

```bash
# Start DocGen workflow
./get-to-work.sh

# Start MCP servers
npm run mcp:start

# Run DocGen commands directly
npm run docgen:check-servers
```

### Windows

On Windows, use the PowerShell-compatible commands:

```powershell
# Using npm scripts (works on all Windows setups)
npm run get-to-work:simple

# Using the Docker fallback
npm run docker:start
npm run docker:exec -- bash scripts/unix/get-to-work.sh
```

### Using Docker (All Platforms)

Docker provides a consistent environment across all platforms:

```bash
# Build and start the Docker container
npm run docker:build
npm run docker:start

# Run the get-to-work script inside Docker
npm run docker:exec -- bash scripts/unix/get-to-work.sh

# Enter an interactive shell in Docker
npm run docker:shell
```

## MCP Server Management

Model Context Protocol (MCP) servers can be started on any platform:

```bash
# Cross-platform MCP server start
npm run mcp:start

# Check MCP server status
npm run docgen:check-servers
```

## Environment Indicators

DocGen creates indicator files to track the environment:

- `.mcp-in-docker`: Created when using Docker
- `mcp-servers/mcp-docker-running`: Indicates MCP servers running in Docker

## When to Use Docker

Docker is recommended when:

1. You want a consistent environment across platforms
2. You're having issues with native scripts on your platform
3. You need to ensure MCP servers run with the exact same configuration

## Troubleshooting

### Script Issues

If you encounter script issues:

1. Try the simplified script: `npm run get-to-work:simple`
2. Use Docker as a fallback: `npm run docker:shell`
3. Check if indicator files are present in correct locations

### MCP Server Issues

For MCP server problems:

1. Check server status: `npm run docgen:check-servers`
2. Try restarting servers: `npm run mcp:start`
3. Verify the Docker environment: `npm run docker:status`
4. Check for error logs in the terminal output

## Cross-Platform Development

When developing:

1. Test on multiple platforms when possible
2. Use Docker to verify cross-platform compatibility
3. Consider path differences (forward slashes vs. backslashes)
4. Test MCP servers in different environments