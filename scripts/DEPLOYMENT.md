# DocGen MCP Deployment Guide

This guide explains how to deploy the DocGen MCP servers and configure Windsurf integration using the automated deployment script.

## Overview

The DocGen project uses a streamlined deployment approach where:

1. All MCP servers are deployed using Docker containers
2. Sensitive API keys and tokens (Anthropic, GitHub) are stored in the `.env` file
3. The deployment process is automated with Python scripts
4. Windsurf configuration is automatically handled during deployment

## Prerequisites

- Docker and Docker Compose installed and running
- Python 3.6+ installed
- Valid Anthropic API key
- Valid GitHub API token with repo scope
- Git configured with access to the DocGen repository

## Configuration

Before deployment, ensure your `.env` file is properly configured with the following variables:

```
# LLM API Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# GitHub API Token (with repo scope)
GITHUB_TOKEN=your-github-token-here

# GitHub Repository Information
GITHUB_OWNER=mprestonsparks
GITHUB_REPO=DocGen

# Feature Flags
ENABLE_AI_ENHANCEMENT=true
ENABLE_ADVANCED_VALIDATION=true
```

## Deployment

### Automated Deployment

The easiest way to deploy the MCP servers is using the automated deployment script:

```bash
python scripts/deploy_mcp.py
```

This script will:
1. Check for required environment variables
2. Create Docker secrets for sensitive information
3. Build Docker images for all MCP servers
4. Start Docker containers
5. Configure Windsurf to use the MCP servers

### Options

The deployment script supports the following options:

- `--config CONFIG`: Path to custom configuration file (default: `.env`)
- `--no-windsurf`: Skip Windsurf configuration
- `--dev`: Use development mode (interactive console with logs)

Example:
```bash
python scripts/deploy_mcp.py --dev
```

### Manual Deployment

If you prefer to deploy manually, follow these steps:

1. Create Docker secrets:
   ```bash
   mkdir -p docker/mcp/secrets
   echo "your-anthropic-api-key" > docker/mcp/secrets/anthropic_api_key
   echo "your-github-token" > docker/mcp/secrets/github_token
   ```

2. Build and start the Docker containers:
   ```bash
   docker-compose -f docker/mcp/docker-compose.yml build
   docker-compose -f docker/mcp/docker-compose.yml up -d
   ```

3. Configure Windsurf:
   Create a file at `~/.codeium/windsurf/mcp_config.json` with the following content:
   ```json
   {
     "servers": [
       {
         "name": "DocGen Orchestrator",
         "url": "http://localhost:3500/mcp",
         "capabilities": [
           "document.generate",
           "document.generate.stream",
           "code.complete",
           "semantic.analyze",
           "nlp.process",
           "fs.readFile",
           "fs.writeFile",
           "fs.listFiles",
           "fs.deleteFile",
           "test.discover",
           "test.run",
           "test.analyze",
           "test.history",
           "test.flaky",
           "todo.scan",
           "todo.categorize",
           "todo.findRelated",
           "todo.update",
           "github.repository.info",
           "github.issues.list",
           "github.issues.create",
           "github.issues.analyzeDependencies",
           "github.issues.prioritize",
           "github.issues.createFromTODOs",
           "github.issues.updateStatus",
           "github.issues.addComment",
           "github.pullRequests.list",
           "github.pullRequests.get",
           "github.pullRequests.create",
           "github.pullRequests.merge",
           "github.pullRequests.getReviews",
           "github.pullRequests.createReview",
           "workflow.create",
           "workflow.get",
           "workflow.execute",
           "workflow.testing.execute",
           "workflow.issues.execute",
           "workflow.todos.execute"
         ]
       }
     ]
   }
   ```

## Verification

To verify that the MCP servers are running correctly:

1. Check Docker container status:
   ```bash
   docker-compose -f docker/mcp/docker-compose.yml ps
   ```

2. Check server health:
   ```bash
   curl http://localhost:3500/health
   curl http://localhost:3200/health
   curl http://localhost:3000/health
   ```

3. Test the GET-TO-WORK script:
   ```bash
   python scripts/get_to_work.py --phase testing
   ```

## Troubleshooting

### Common Issues

1. **Docker containers not starting:**
   - Check Docker logs: `docker-compose -f docker/mcp/docker-compose.yml logs`
   - Ensure Docker daemon is running: `docker info`

2. **API authentication failures:**
   - Verify API keys in `.env` file
   - Check Docker secrets were created correctly

3. **Windsurf not connecting to MCP servers:**
   - Verify Windsurf configuration at `~/.codeium/windsurf/mcp_config.json`
   - Ensure MCP servers are running and accessible
   - Restart Windsurf

### Logs

Logs are stored in the `docker/mcp/logs` directory. You can also view logs directly from Docker:

```bash
docker-compose -f docker/mcp/docker-compose.yml logs -f
```

## Stopping the Servers

To stop the MCP servers:

```bash
docker-compose -f docker/mcp/docker-compose.yml down
```

To stop and remove all containers, networks, and volumes:

```bash
docker-compose -f docker/mcp/docker-compose.yml down -v
```
