# DocGen MCP Server Implementation Plan

This implementation plan outlines the strategy for integrating Model Context Protocol (MCP) servers into the DocGen project using Docker, based on DeepResearch findings and official MCP specifications.

> **IMPLEMENTATION STATUS (Updated 2025-03-28T12:45:00-05:00):**  
> Phase 1 and Phase 2 have been completed. MCP servers are now running with proper Docker configuration, environment variable-based credential management, dynamic port allocation, streaming responses, file system access, advanced GitHub integration, authentication with rate limiting, and multi-server orchestration. Additionally, we've implemented a TypeScript-based MCP bridge that enables integration with Windsurf on Windows. The infrastructure is ready for further development in Phase 3, with focus areas identified for strengthening the implementation before adding advanced capabilities.

## 1. Architectural Foundation

### 1.1 MCP Client-Host-Server Model 
We will implement the MCP architecture following the client-host-server pattern:

- **Hosts**: Coordinate multiple client instances (1:1 with servers), enforce security policies, and perform context aggregation
- **Clients**: Maintain stateful JSON-RPC sessions with servers, handle bidirectional message routing, and negotiate capabilities
- **Servers**: Expose specialized resources through MCP primitives, operating as either local processes or cloud services

This separation ensures secure AI capability integration while maintaining clear boundaries between application logic and external resources.

### 1.2 Docker Infrastructure Requirements 
Our implementation will enforce:

1. **Network Isolation**: Per-server Docker networks with controlled ingress/egress rules
2. **Resource Partitioning**: CPU/memory constraints to prevent AI agent interference
3. **Ephemeral Storage**: Temporary workspace volumes with automatic cleanup
4. **API Gateway**: Reverse proxy for managing MCP server endpoints

## 2. Repository Structure 
```
/DocGen
├── docker/
│   ├── mcp/
│   │   ├── servers/
│   │   │   ├── github/                # GitHub integration MCP server
│   │   │   │   ├── Dockerfile
│   │   │   │   └── mcp-manifest.json
│   │   │   ├── main/                  # Primary MCP server
│   │   │   │   ├── Dockerfile
│   │   │   │   └── mcp-manifest.json
│   │   │   └── orchestrator/          # MCP orchestrator server
│   │   │       ├── Dockerfile
│   │   │       └── src/               # Orchestrator source code
│   │   ├── docker-compose.mcp.yml     # MCP-specific compose file
│   │   ├── .env.mcp.template          # Template for MCP environment variables
│   │   └── README.md                  # Documentation for MCP setup
│   ├── secrets/                       # Secure storage for API keys and tokens
│   │   └── README.md                  # Instructions for secret management
│   └── config/                        # Configuration files for MCP servers
│       └── routing.yaml               # Multi-server orchestration config
├── scripts/
│   ├── python/                        # Python scripts for DevOps automation
│   │   ├── mcp_server_setup.py        # Cross-platform MCP setup script
│   │   └── mcp_health_check.py        # Health monitoring for MCP servers
│   └── deploy.sh                      # Deployment script for CI/CD integration
├── src/
│   ├── mcp/
│   │   └── bridge/                    # MCP bridge for Windsurf integration
│   │       ├── mcp-bridge.ts          # TypeScript bridge implementation
│   │       ├── package.json           # Dependencies for the bridge
│   │       └── tsconfig.json          # TypeScript configuration
└── docs/
    └── mcp-setup.md                   # Documentation for MCP setup
```

> **IMPLEMENTATION NOTE:**  
> We've followed the project convention of using Python for all DevOps automation while maintaining TypeScript for application code. The MCP server setup script has been implemented in Python for cross-platform compatibility.

## 3. Docker Configuration

### 3.1 Docker Compose Configuration 

The `docker-compose.mcp.yml` file implements a multi-tier network architecture:

```yaml
version: '3.8'

services:
  # For development purposes, we've simplified the setup by commenting out
  # the vault service and using environment variables for API keys
  # instead of Docker secrets
  
  mcp-github:
    build:
      context: ./servers/github
      dockerfile: Dockerfile
    container_name: docgen-mcp-github
    restart: unless-stopped
    ports:
      - "${GITHUB_MCP_PORT_RANGE:-3000-3100}:3000"
    volumes:
      - ../../:/workspace:ro
      - mcp-github-data:/app/data
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    env_file:
      - ./.env.mcp
    networks:
      - mcp-frontend
      - mcp-backend
    deploy:
      resources:
        limits:
          cpus: '${MCP_CPU_LIMIT:-0.5}'
          memory: '${MCP_MEMORY_LIMIT:-1g}'
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      
  mcp-main:
    build:
      context: ./servers/main
      dockerfile: Dockerfile
    container_name: docgen-mcp-main
    restart: unless-stopped
    ports:
      - "${MAIN_MCP_PORT_RANGE:-3200-3300}:3200"
      - "${MAIN_MCP_HEALTH_PORT_RANGE:-8800-8900}:8800"
    volumes:
      - ../../:/workspace:ro
      - mcp-main-data:/app/data
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - MCP_API_KEY=development_key
      - MCP_API_KEYS=orchestrator:${GITHUB_TOKEN},github:${GITHUB_TOKEN}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
    env_file:
      - ./.env.mcp
    networks:
      - mcp-frontend
      - mcp-backend
    deploy:
      resources:
        limits:
          cpus: '${MCP_CPU_LIMIT:-1.0}'
          memory: '${MCP_MEMORY_LIMIT:-2g}'
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8800/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  mcp-orchestrator:
    build:
      context: ./servers/orchestrator
      dockerfile: Dockerfile
    container_name: docgen-mcp-orchestrator
    restart: unless-stopped
    ports:
      - "${ORCHESTRATOR_PORT_RANGE:-8080-8180}:8080"
    volumes:
      - ./config:/etc/mcp:ro
    environment:
      - MCP_API_KEY=development_key
      - MCP_API_KEYS=orchestrator:${GITHUB_TOKEN},github:${GITHUB_TOKEN}
      - GITHUB_MCP_URL=http://mcp-github:3000
      - MAIN_MCP_URL=http://mcp-main:3200
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - MCP_CONFIG_PATH=/etc/mcp/routing.yaml
    env_file:
      - ./.env.mcp
    networks:
      - mcp-frontend
      - mcp-backend
    depends_on:
      - mcp-github
      - mcp-main
    deploy:
      resources:
        limits:
          cpus: '${MCP_CPU_LIMIT:-0.5}'
          memory: '${MCP_MEMORY_LIMIT:-1g}'
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  mcp-frontend:
    driver: bridge
  mcp-backend:
    driver: bridge

volumes:
  mcp-github-data:
  mcp-main-data:
```

> **IMPLEMENTATION NOTE:**  
> For development simplicity, we've modified the Docker Compose configuration to use environment variables for API keys instead of Docker secrets or direct file mounts. This approach simplifies deployment while maintaining security through proper environment variable management.

### 3.2 Environment Variables 

We've created a `.env.mcp` file that supports dynamic port allocation and resource constraints:

```
# MCP Server Configuration
MCP_ENV=development
MCP_LOG_LEVEL=info

# Security Configuration
GITHUB_TOKEN=your_github_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Dynamic Port Ranges (each server will use one port from its range)
GITHUB_MCP_PORT_RANGE=3000-3100
MAIN_MCP_PORT_RANGE=3200-3300
MAIN_MCP_HEALTH_PORT_RANGE=8800-8900
ORCHESTRATOR_PORT_RANGE=8080-8180

# Resource Limits
MCP_MEMORY_LIMIT=2g
MCP_CPU_LIMIT=1.0

# Network Configuration
MCP_FRONTEND_SUBNET=172.28.5.0/24
MCP_BACKEND_SUBNET=172.28.6.0/24
```

### 3.3 MCP Server Setup Script

The `mcp_server_setup.py` script automates the setup and configuration of MCP servers:

```python
def find_free_port(start_port=3000, end_port=4000):
    """Find a free port in the given range"""
    for port in range(start_port, end_port):
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            try:
                s.bind(('', port))
                return port
            except socket.error:
                continue
    raise RuntimeError(f"No free ports available in range {start_port}-{end_port}")
```

## 4. Phase 2 Enhancements

Phase 2 of the implementation plan has been completed, adding the following enhancements:

### 4.1 Streaming Document Generation
We've implemented streaming responses for document generation in the Main MCP server, allowing for real-time delivery of generated content to clients. This significantly improves the user experience for long-form document generation.

### 4.2 File System Access
Added secure file system access capabilities to the Main MCP server, enabling clients to read, write, list, and delete files within the workspace directory. This feature is essential for document generation and manipulation.

### 4.3 Advanced GitHub Integration
Enhanced the GitHub MCP server with advanced pull request management capabilities, including creating, reviewing, and merging pull requests. This provides a more comprehensive GitHub integration for the DocGen project.

### 4.4 Authentication and Rate Limiting
Implemented API key authentication and rate limiting for all MCP servers to ensure secure access and prevent abuse. This is crucial for production deployments where multiple clients may access the MCP servers.

### 4.5 Multi-Server Orchestration
Developed the MCP orchestrator service to coordinate multiple MCP servers and provide a unified API for clients. The orchestrator routes requests to the appropriate server based on the method and aggregates capabilities from all servers.

## 5. Next Steps (Phase 3)

With Phases 1 and 2 successfully completed, Phase 3 will focus on implementing the specific MCP capabilities needed to support Windsurf's built-in Cascade AI in executing the "get-to-work" workflow (testing, issues, and TODOs).

> **IMPLEMENTATION PRIORITY:**  
> Phase 3 has been streamlined to focus exclusively on implementing the MCP server capabilities required by Windsurf's Cascade AI to automate the "get-to-work" workflow. These capabilities will be accessible to Windsurf through its native MCP integration.

### 5.1 Core MCP Capabilities for "Get-to-Work" Workflow

#### Testing Phase Capabilities
- **Test Discovery and Execution**
  - Implement endpoints for discovering available tests across the codebase
  - Add support for test execution with filtering and parallelization options
  - Create result parsers for extracting pass/fail status, execution time, and error details
  
- **Test Analysis**
  - Implement test failure analysis to identify root causes
  - Add test history tracking to detect flaky tests
  - Create result aggregation for test runs across multiple test suites

#### Issues Phase Capabilities
- **GitHub Issue Management**
  - Implement comprehensive GitHub issue listing with filtering by labels, assignees, and status
  - Add issue dependency detection and relationship mapping functionality
  - Create endpoints for issue updates, comments, assignment, and label management
  
- **Issue Prioritization**
  - Implement algorithms for intelligent issue prioritization based on dependencies
  - Add support for analyzing issue relationships and blockers
  - Create context extraction for understanding issue relevance to codebase

#### TODOs Phase Capabilities
- **TODO Discovery and Analysis**
  - Implement codebase scanning for TODO comments across all files
  - Add comment extraction and parsing for understanding priority and context
  - Create metadata generation for TODO categorization
  
- **TODO-Issue Integration**
  - Implement GitHub issue creation from TODO comments
  - Add relationship tracking between TODOs and existing issues
  - Create endpoints for updating or resolving TODOs in code

### 5.2 Windsurf MCP Configuration

- **Windsurf Integration**
  - Create proper `~/.codeium/windsurf/mcp_config.json` configuration for our MCP servers
  - Ensure MCP servers are correctly registered in the JSON schema that Windsurf expects
  - Implement server registration compatible with Windsurf's UI-based server addition
  
- **Configuration Documentation**
  - Create detailed documentation for configuring our MCP servers in Windsurf
  - Include example `mcp_config.json` configurations for each server
  - Provide instructions for both UI-based and direct JSON configuration approaches

- **Compatibility Considerations**
  - Ensure our MCP servers only expose tool endpoints (not prompts or resources, which Windsurf doesn't support)
  - Implement proper transport type (`stdio`) as required by Windsurf
  - Optimize tool outputs to work within Windsurf's display capabilities (no image outputs)

### 5.3 Stability and Security

- **Authentication and Authorization**
  - Finalize authentication for secure MCP server access
  - Implement proper API key validation and rate limiting
  - Add access controls for different operations

- **Error Handling and Reliability**
  - Implement comprehensive error reporting suitable for AI consumption
  - Add graceful degradation for partial API failures
  - Create detailed logging for troubleshooting

- **Docker Refinements**
  - Optimize Docker configurations for production use
  - Ensure secure secret management in containers
  - Implement health monitoring specific to MCP server needs

### 5.4 Demonstration Script

- Develop a simple Python script that demonstrates the "get-to-work" workflow
- Create a command-line interface to execute the three workflow phases
- Document usage as an alternative to direct Windsurf Cascade AI interaction

> **IMPLEMENTATION NOTE:**  
> By focusing on these specific capabilities, we will deliver MCP servers that integrate seamlessly with Windsurf's built-in Cascade AI, enabling it to automate the "get-to-work" workflow without requiring additional IDE plugins or complex integration code. This approach aligns with our project's goal of enhancing AI capabilities while maintaining simplicity and focusing on our core objectives.

## 7. Windsurf Integration

### 7.1 MCP Bridge Architecture

To enable integration with Windsurf, we've implemented a TypeScript-based MCP bridge that:

1. Implements the stdio transport interface that Windsurf requires
2. Forwards requests from Windsurf to our Docker-based HTTP MCP servers
3. Returns responses back to Windsurf

This bridge approach allows us to maintain our Docker-based infrastructure while providing seamless integration with Windsurf.

```
┌─────────────┐      stdio      ┌─────────────┐      HTTP      ┌─────────────┐
│   Windsurf  │ ◄──────────────►│ MCP Bridge  │ ◄─────────────►│ MCP Servers │
└─────────────┘                 └─────────────┘                └─────────────┘
```

### 7.2 Automated Deployment

The `deploy_mcp.py` script has been enhanced to:

1. Deploy Docker containers for MCP servers
2. Build the TypeScript MCP bridge
3. Configure Windsurf to use the bridge

This automation ensures a streamlined setup process for developers.

### 7.3 Configuration Format

Windsurf requires a specific configuration format in `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "docgen-mcp-bridge": {
      "command": "node",
      "args": [
        "/path/to/mcp-bridge.js"
      ],
      "env": {
        "MCP_ORCHESTRATOR_URL": "http://localhost:8080/mcp",
        "MCP_API_KEY": "development_key"
      }
    }
  }
}
```

The deployment script automatically generates this configuration based on the current environment.

## 8. Future Development

### 8.1 Cross-Platform Support

The current implementation supports Windsurf on Windows. Future development will extend support to:

- Windsurf on macOS
- Windsurf on Linux
- Claude Code on macOS
- Other AI-assisted development tools

### 8.2 Modular Bridge Architecture

To support multiple tools and platforms, we plan to refactor the bridge implementation into a more modular architecture:

```
/src/mcp/bridge/
  /common/          # Shared code for all bridges
  /windsurf/        # Windsurf-specific bridge implementation
  /claude-code/     # Claude Code-specific bridge implementation
```

This modular approach will maintain a consistent user experience across different environments while accommodating the specific requirements of each tool.
