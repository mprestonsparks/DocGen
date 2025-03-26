# DocGen MCP Server Implementation Plan

This implementation plan outlines the strategy for integrating Model Context Protocol (MCP) servers into the DocGen project using Docker, based on DeepResearch findings and official MCP specifications.

> **IMPLEMENTATION STATUS (Updated 2025-03-26T15:22:45-05:00):**  
> Phase 1 and Phase 2 have been completed. MCP servers are now running with proper Docker configuration, secure credential management, dynamic port allocation, streaming responses, file system access, advanced GitHub integration, authentication with rate limiting, and multi-server orchestration. The infrastructure is ready for further development in Phase 3, with focus areas identified for strengthening the implementation before adding advanced capabilities.

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
  # the vault service and using direct file mounts for secrets
  # instead of Docker secrets
  
  # mcp-vault:
  #   image: vault:latest
  #   container_name: docgen-mcp-vault
  #   restart: unless-stopped
  #   volumes:
  #     - ./secrets:/vault/secrets:ro
  #     - mcp-vault-data:/vault/data
  #   environment:
  #     VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN}
  #   cap_drop:
  #     - ALL
  #   cap_add:
  #     - NET_BIND_SERVICE
  #   networks:
  #     - mcp-backend
  #   healthcheck:
  #     test: ["CMD", "vault", "status"]
  #     interval: 30s
  #     timeout: 5s
  #     retries: 3
      
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
      - ../secrets/github_token.txt:/run/secrets/github_token:ro
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
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
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
      - ../secrets/anthropic_key.txt:/run/secrets/anthropic_key:ro
      - ../secrets/mcp_api_keys.txt:/run/secrets/mcp_api_keys:ro
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
      test: ["CMD", "curl", "-f", "http://localhost:8800/health"]
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
      - ../secrets/mcp_api_keys.txt:/run/secrets/mcp_api_keys:ro
    env_file:
      - ./.env.mcp
    environment:
      - GITHUB_MCP_URL=http://mcp-github:3000
      - MAIN_MCP_URL=http://mcp-main:3200
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
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  mcp-frontend:
    driver: bridge
  mcp-backend:
    driver: bridge

volumes:
  # mcp-vault-data:
  mcp-github-data:
  mcp-main-data:
```

> **IMPLEMENTATION NOTE:**  
> For development simplicity, we've modified the Docker Compose configuration to use direct file mounts for secrets instead of Docker secrets. The vault service has been commented out for now and will be implemented in a future phase.

### 3.2 Environment Variables 

We've created a `.env.mcp` file that supports dynamic port allocation and resource constraints:

```
# MCP Server Configuration
MCP_ENV=development
MCP_LOG_LEVEL=info

# Security Configuration
VAULT_TOKEN=your_vault_token_here

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

Phase 3 of the implementation plan will focus on the following areas:

### 5.1 Comprehensive Testing
- Implement unit tests for all MCP server components
  - Create test suites for each service (GitHub, Main, Orchestrator)
  - Implement mock-based tests for external dependencies
  - Add integration tests for cross-service functionality
- Develop integration tests for the entire MCP infrastructure
  - Test end-to-end workflows across multiple services
  - Verify error handling and recovery mechanisms
- Create load testing scenarios to ensure scalability
  - Simulate multiple concurrent clients
  - Test rate limiting effectiveness under load
  - Measure performance degradation under stress

### 5.2 Production Hardening
- Implement proper Docker secrets management with Vault
  - Replace direct file mounts with Vault integration
  - Set up secure secret rotation policies
  - Implement least-privilege access controls
- Enhance security with TLS encryption for all communications
  - Generate and manage TLS certificates
  - Implement mutual TLS for service-to-service communication
  - Add certificate rotation procedures
- Add comprehensive logging and monitoring
  - Implement structured logging with correlation IDs
  - Set up centralized log aggregation
  - Create dashboards for key metrics and health indicators
- Implement backup and recovery procedures
  - Develop data backup strategies
  - Create disaster recovery playbooks
  - Test recovery scenarios regularly

### 5.3 Advanced Capabilities
- Add support for WebSocket connections for real-time updates
  - Implement bidirectional communication channels
  - Add support for server-sent events
  - Create notification mechanisms for long-running processes
- Implement batch processing for document generation
  - Design queue-based processing system
  - Add support for background job scheduling
  - Implement progress tracking and reporting
- Develop advanced document templating features
  - Create template management system
  - Add support for custom template variables
  - Implement template versioning
- Add support for additional AI models and services
  - Integrate with multiple LLM providers
  - Implement model selection and fallback strategies
  - Add specialized models for specific document types

### 5.4 Client Integration
- Create client libraries for easy integration with the MCP servers
  - Develop TypeScript/JavaScript client library
  - Add comprehensive error handling
  - Implement automatic retries and circuit breaking
- Develop example applications demonstrating MCP server usage
  - Create sample web application
  - Build CLI tool for document generation
  - Implement VS Code extension for developer workflow
- Create comprehensive documentation for client developers
  - Write detailed API reference
  - Create getting started guides
  - Add tutorials for common use cases

### 5.5 Priority Areas Before Advanced Development

Based on our implementation review, the following areas should be addressed before proceeding with advanced capabilities:

1. **Strengthen Error Handling and Resilience**
   - Implement comprehensive error handling in all services
   - Add retry mechanisms for transient failures
   - Develop circuit breakers to prevent cascading failures

2. **Enhance Observability**
   - Implement detailed request logging
   - Add performance metrics collection
   - Create health check endpoints with detailed status information

3. **Improve Security Posture**
   - Conduct security audit of current implementation
   - Address any identified vulnerabilities
   - Implement additional security controls as needed

4. **Expand Test Coverage**
   - Develop unit tests for core functionality
   - Create integration tests for critical paths
   - Implement automated testing in CI/CD pipeline

> With Phase 2 now complete, the MCP infrastructure provides a solid foundation for advanced AI capabilities in the DocGen project. By addressing the priority areas identified above, we can ensure the system is robust, secure, and maintainable before proceeding with the advanced capabilities planned for Phase 3.
