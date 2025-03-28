# DocGen Scripts

This directory contains various scripts for automating tasks in the DocGen project.

## GET-TO-WORK Script

A Python-based workflow orchestration tool for the DocGen project that helps developers get started with their work by automating the discovery and prioritization of tasks.

### Overview

The GET-TO-WORK script automates the process of setting up your development environment and identifying the most important tasks to work on. It communicates with the MCP (Model Context Protocol) servers to execute a three-phase workflow:

1. **Testing Phase**: Discovers and runs tests, identifying failing tests that need attention.
2. **Issues Phase**: Analyzes GitHub issues, detects dependencies between them, and prioritizes them based on importance and dependencies.
3. **TODOs Phase**: Scans the codebase for TODO comments, categorizes them, and optionally creates GitHub issues from them.

### Requirements

- Python 3.6+
- Git (configured with a GitHub remote)
- Access to the MCP Orchestrator server

### Usage

```bash
python get_to_work.py [--directory DIR] [--owner OWNER] [--repo REPO] [--no-create-issues] [--phase {testing,issues,todos,all}]
```

#### Options

- `--directory DIR`: Directory to scan for tests and TODOs (default: current directory)
- `--owner OWNER`: GitHub repository owner (default: from git config)
- `--repo REPO`: GitHub repository name (default: from git config)
- `--no-create-issues`: Don't create GitHub issues from TODOs
- `--orchestrator-url URL`: URL of the MCP Orchestrator server (default: http://localhost:3500/mcp)
- `--phase {testing,issues,todos,all}`: Specific phase to run (default: all)

#### Examples

Run the full workflow on the current directory:
```bash
python get_to_work.py
```

Run only the testing phase:
```bash
python get_to_work.py --phase testing
```

Run the workflow on a specific directory without creating issues from TODOs:
```bash
python get_to_work.py --directory ./src --no-create-issues
```

Specify the GitHub repository manually:
```bash
python get_to_work.py --owner mprestonsparks --repo DocGen
```

## MCP Deployment Script

The `deploy_mcp.py` script automates the deployment of MCP servers and configures Windsurf integration.

### Overview

This script handles:
1. Building and starting Docker containers for all MCP servers
2. Building and configuring the MCP bridge for Windsurf integration
3. Setting up environment variables

### Requirements

- Python 3.6+
- Docker and Docker Compose
- Node.js and npm (for building the TypeScript bridge)
- Git (configured with a GitHub remote)

### Usage

```bash
python deploy_mcp.py [--config CONFIG] [--no-windsurf] [--dev]
```

#### Options

- `--config CONFIG`: Path to custom configuration file (default: .env)
- `--no-windsurf`: Skip Windsurf configuration
- `--dev`: Use development mode (hot reloading, debug logs)

#### Examples

Deploy MCP servers and configure Windsurf integration:
```bash
python deploy_mcp.py
```

Deploy MCP servers without Windsurf integration:
```bash
python deploy_mcp.py --no-windsurf
```

Deploy MCP servers in development mode:
```bash
python deploy_mcp.py --dev
```

### What It Does

1. **Environment Setup**:
   - Loads environment variables from .env file
   - Updates MCP-specific environment configuration

2. **Docker Deployment**:
   - Builds Docker images for MCP servers
   - Starts Docker containers with proper configuration

3. **Windsurf Integration**:
   - Builds the TypeScript MCP bridge
   - Configures Windsurf to use the bridge
   - Sets up proper authentication and communication

## Integration with Windsurf

While the GET-TO-WORK script provides a standalone interface for the get-to-work workflow, the same functionality is available directly in Windsurf through the MCP servers. Windsurf's Cascade AI can interact with the MCP servers to perform the same workflow and provide intelligent assistance based on the results.

### How It Works

1. The `deploy_mcp.py` script sets up the MCP servers and configures Windsurf
2. The TypeScript bridge enables communication between Windsurf and the MCP servers
3. Windsurf's Cascade AI can then access all the capabilities of the MCP servers

This integration allows developers to use the get-to-work workflow directly within Windsurf, without having to run the Python script manually.

## Output

The script provides detailed output for each phase of the workflow, including:

- Test results and analysis of failing tests
- Prioritized list of GitHub issues
- Discovered TODOs in the codebase
- A summary with recommended next steps

## Troubleshooting

If you encounter issues with the scripts, check the following:

1. Ensure the MCP Orchestrator server is running and accessible
2. Verify your GitHub repository is correctly configured
3. Check that you have the necessary permissions to access the repository
4. Make sure Docker is running and properly configured
5. Ensure Node.js and npm are installed for building the TypeScript bridge

For more detailed error information, examine the error messages in the output.
