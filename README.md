# DocGen

A modular documentation generation system with support for academic paper implementation.

## Overview

DocGen is designed to automate the creation and management of documentation for software projects. It supports a 2x2 matrix of project types:

- **New Standard Projects**: Creating documentation for new projects from scratch
- **New Paper-Based Projects**: Creating implementations based on academic papers
- **Existing Standard Projects**: Analyzing and documenting existing codebases
- **Existing Paper-Based Projects**: Adding or improving paper-based implementations in existing projects

## Project Structure

```
src/
├── core/            # Core types and utilities
│   ├── types/       # Shared type definitions
│   └── utils/       # Common utility functions
├── modules/         # Reusable modules
│   ├── project-base/        # Base project functionality
│   ├── existing-analyzer/   # Analysis for existing projects
│   └── paper-architect/     # Paper processing and implementation
├── integrations/    # Integration layers for specific project types
│   ├── new-standard/        # New + Standard integration
│   ├── new-paper/           # New + Paper integration
│   ├── existing-standard/   # Existing + Standard integration
│   └── existing-paper/      # Existing + Paper integration
├── cli/             # Command-line interface
└── index.ts         # Main entry point for the library
```

## Technology Stack

- **Application Code**: TypeScript (strict)
- **Infrastructure**: Python
- **Documentation**: Markdown with YAML frontmatter
- **Dependencies**: Node.js, npm

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link for development
npm link
```

## Usage

DocGen can be used as a command-line tool:

```bash
# Create a new standard project
docgen new-standard my-project --description "My awesome project"

# Create a project based on an academic paper
docgen new-paper my-paper-impl --paper path/to/paper.pdf

# Analyze an existing project
docgen analyze path/to/project

# Analyze an existing paper-based project
docgen analyze-paper path/to/project --paper path/to/paper.pdf

# Auto-detect project type
docgen auto path/to/project
```

## Development

### Prerequisites

- Node.js (>= 14.0.0)
- npm (>= 6.0.0)
- Python (>= 3.8) for infrastructure scripts

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd DocGen

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Coding Guidelines

- All application code must be written in TypeScript
- Infrastructure and DevOps scripts are written in Python
- Follow the modular structure for adding new features
- Maintain separation of concerns between modules and integrations

## Documentation

For detailed documentation, see the [docs](./docs) directory.

## MCP System

DocGen includes a Model Context Protocol (MCP) system that enables AI-assisted development through tools like Windsurf and Claude Code.

### Overview

The MCP system consists of:
- Docker-based MCP servers that provide various capabilities
- A TypeScript bridge for integration with Windsurf
- Automated deployment and configuration scripts

### Requirements

- Docker and Docker Compose
- Node.js and npm (for building the TypeScript bridge)
- Python 3.6+ (for running deployment scripts)
- Windsurf (for AI-assisted development)

### Setup and Deployment

1. **Environment Configuration**:
   
   Create a `.env` file in the project root with the following variables:
   ```
   GITHUB_TOKEN=your_github_token
   GITHUB_OWNER=your_github_username
   GITHUB_REPO=DocGen
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

2. **Deploy MCP Servers and Configure Windsurf**:
   ```bash
   python scripts/deploy_mcp.py
   ```
   This script:
   - Builds and starts Docker containers for MCP servers
   - Builds the TypeScript bridge for Windsurf integration
   - Configures Windsurf to use the MCP servers

3. **Restart Windsurf**:
   
   After deployment, restart Windsurf to apply the configuration changes.

### Usage

#### With Windsurf

Once the MCP system is set up and Windsurf is restarted, you can use Cascade AI within Windsurf to:
- Run tests and analyze results
- Manage GitHub issues
- Scan for TODOs in the codebase
- Execute the full "get-to-work" workflow

Simply ask Cascade AI to perform these tasks, and it will communicate with the MCP servers to execute them.

#### With Command Line

You can also use the command-line interface to interact with the MCP servers:

```bash
# Run the full get-to-work workflow
python scripts/get_to_work.py

# Run specific phases
python scripts/get_to_work.py --phase testing
python scripts/get_to_work.py --phase issues
python scripts/get_to_work.py --phase todos
```

### Advanced Configuration

For advanced configuration options, see:
- [MCP Implementation Plan](./MCP_IMPLEMENTATION_PLAN.md) - Detailed architecture and implementation details
- [MCP Bridge README](./src/mcp/bridge/README.md) - Information about the Windsurf integration bridge
- [Scripts README](./scripts/README.md) - Documentation for deployment and workflow scripts

## Scripts

- Scripts for development are organized in:
  - `scripts/windows/` - Windows-specific scripts (.ps1)
  - `scripts/unix/` - Unix-specific scripts (.sh)
  - `scripts/` - Cross-platform scripts

## License

[License information]