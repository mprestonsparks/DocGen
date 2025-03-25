# DocGen MCP Server Docker Configuration

This directory contains the Docker configuration for the Model Context Protocol (MCP) servers used in the DocGen project.

## Directory Structure

```
/docker/mcp/
├── servers/                  # MCP server implementations
│   ├── code-analysis/        # Code analysis MCP server
│   │   ├── Dockerfile
│   │   └── mcp-manifest.json
│   ├── github/               # GitHub integration MCP server
│   │   ├── Dockerfile
│   │   └── mcp-manifest.json
│   └── main/                 # Primary MCP server
│       ├── Dockerfile
│       └── mcp-manifest.json
├── secrets/                  # Secure storage for API keys (never commit to version control)
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
- Security settings

### 2. Secret Management

Add your API keys to the following files in the `secrets` directory:
- `github_token.txt`: GitHub API token
- `anthropic_key.txt`: Anthropic API key

**Important**: Never commit these files to version control!

### 3. Starting the MCP Servers

Use the provided Python script to set up and start the MCP servers:

```bash
python ../../scripts/python/mcp_server_setup.py setup
python ../../scripts/python/mcp_server_setup.py start
```

The setup script will:
1. Create the necessary environment files
2. Set up secret directories with proper permissions
3. Assign dynamic ports to avoid conflicts

### 4. Checking Server Status

To check the status of running MCP servers:

```bash
python ../../scripts/python/mcp_server_setup.py status
```

### 5. Stopping the Servers

To stop all MCP servers:

```bash
python ../../scripts/python/mcp_server_setup.py stop
```

## Security Considerations

- All API keys are stored as Docker secrets
- MCP servers run with read-only filesystems
- Network isolation is implemented with separate frontend and backend networks
- Resource limits are enforced to prevent container interference

## Health Monitoring

The MCP setup includes comprehensive health monitoring:
- Container status checks
- TCP connectivity tests
- HTTP health endpoints
- Resource usage monitoring

## Troubleshooting

If the MCP servers fail to start or become unhealthy:

1. Check Docker logs:
   ```bash
   docker logs docgen-mcp-github
   docker logs docgen-mcp-code-analysis
   docker logs docgen-mcp-main
   ```

2. Verify port availability:
   ```bash
   netstat -tuln | grep <port>
   ```

3. Ensure all required API keys are properly configured in the secrets directory
