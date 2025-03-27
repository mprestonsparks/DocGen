# DocGen MCP Server Docker Configuration

This directory contains the Docker configuration for the Model Context Protocol (MCP) servers used in the DocGen project.

## Directory Structure

```
/docker/mcp/
├── servers/                  # MCP server implementations
│   ├── github/               # GitHub integration MCP server
│   │   ├── Dockerfile
│   │   └── src/              # GitHub MCP server source code
│   ├── main/                 # Primary MCP server
│   │   ├── Dockerfile
│   │   └── src/              # Main MCP server source code
│   └── orchestrator/         # MCP orchestrator server
│       ├── Dockerfile
│       └── src/              # Orchestrator server source code
├── config/                   # Configuration files for MCP servers
│   └── routing.yaml          # Multi-server orchestration config
├── docker-compose.mcp.yml    # MCP-specific compose file
├── .env.mcp.template         # Template for MCP environment variables
└── README.md                 # This file
```

## Setup Instructions

### 1. Environment Configuration

Copy the environment template to create your configuration:

```bash
cp .env.mcp.template .env.mcp
```

Edit the `.env.mcp` file to configure:
- Port ranges for each MCP server
- Resource limits
- API keys for GitHub and Anthropic
- GitHub repository information

### 2. API Key Management

The MCP servers use environment variables for API key management. Make sure to set the following environment variables in your `.env.mcp` file:

```
GITHUB_TOKEN=your_github_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GITHUB_OWNER=your_github_username_or_organization
GITHUB_REPO=your_repository_name
```

### 3. Starting the MCP Servers

Use the provided Python script to set up and start the MCP servers:

```bash
python ../../scripts/deploy_mcp.py --dev
```

The deployment script will:
1. Create/update the necessary environment files
2. Build Docker images for the MCP servers
3. Start the Docker containers
4. Configure Windsurf integration (if enabled)

### 4. Checking Server Status

To check the status of running MCP servers:

```bash
docker ps
docker inspect --format='{{.Name}} - Health: {{.State.Health.Status}}' docgen-mcp-orchestrator docgen-mcp-main docgen-mcp-github
```

### 5. Stopping the Servers

To stop all MCP servers:

```bash
docker-compose -f docker-compose.mcp.yml down
```

## Security Considerations

- All API keys are stored as environment variables
- MCP servers run with read-only filesystems where appropriate
- Network isolation is implemented with separate frontend and backend networks
- Resource limits are enforced to prevent container interference

## Health Monitoring

The MCP setup includes comprehensive health monitoring:
- Container health checks using wget
- HTTP health endpoints for each server
- Resource usage monitoring

## Troubleshooting

If the MCP servers fail to start or become unhealthy:

1. Check Docker logs:
   ```bash
   docker logs docgen-mcp-github
   docker logs docgen-mcp-main
   docker logs docgen-mcp-orchestrator
   ```

2. Verify port availability:
   ```bash
   netstat -tuln | grep <port>
   ```

3. Ensure all required API keys are properly configured in the `.env.mcp` file

4. Check if the routing configuration is correct:
   ```bash
   cat config/routing.yaml
   ```

5. Verify that the Docker containers have the necessary tools installed:
   ```bash
   docker exec -it docgen-mcp-orchestrator /bin/sh
   which wget
   ```
