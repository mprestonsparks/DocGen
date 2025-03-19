# DocGen Docker Usage Guide

This guide explains how to use Docker with DocGen for cross-platform development and deployment.

## Quick Start

```bash
# Start DocGen with Docker
npm run docker:start

# Run the get-to-work script inside Docker
npm run docker:exec bash scripts/unix/get-to-work.sh

# Run tests inside Docker
npm run docker:exec npm test

# Enter Docker shell for direct interaction
npm run docker:shell
```

## Docker Commands

DocGen provides several npm scripts for Docker management:

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build the Docker image |
| `npm run docker:start` | Start the Docker container |
| `npm run docker:stop` | Stop the Docker container |
| `npm run docker:status` | Check the status of the Docker container |
| `npm run docker:exec <cmd>` | Execute a command in the Docker container |
| `npm run docker:shell` | Enter an interactive shell in the Docker container |

## MCP Servers in Docker

Model Context Protocol (MCP) servers can be managed with Docker:

```bash
# Start MCP servers in Docker
npm run docker:exec bash mcp-servers/start-mcp-adapters.sh

# Check MCP server status
npm run docker:exec node docgen.js check-servers
```

## Cross-Platform Development

DocGen's Docker integration provides a consistent environment across platforms:

1. **macOS/Linux**: Use native scripts with Docker as an option
2. **Windows**: Use PowerShell scripts or Docker as a fallback
3. **CI/CD**: Use Docker for consistent testing environments

## File Sharing

When you run DocGen in Docker, your local files are mounted inside the container:

- Local project directory → `/app` in Docker
- Changes made to files are immediately reflected
- Node modules are kept inside Docker to avoid platform-specific issues

## Environment Variables

Docker container uses environment variables defined in your `.env` file. If no `.env` file exists, it will be created from `.env.example` when you start the container.

## Troubleshooting

If you encounter issues:

1. Check if the Docker container is running with `npm run docker:status`
2. Ensure Docker Desktop is running (macOS/Windows)
3. Try rebuilding the image with `npm run docker:build`
4. Restart the container with `npm run docker:stop` followed by `npm run docker:start`