# Cross-Platform Usage Guide for DocGen

This guide explains how to use DocGen on different operating systems (Windows, macOS, and Linux) using our Docker-first approach.

## Table of Contents

1. [Overview](#overview)
2. [Docker-Based Workflow (Recommended)](#docker-based-workflow-recommended)
3. [Native Workflow](#native-workflow)
4. [Windows-Specific Instructions](#windows-specific-instructions)
5. [Troubleshooting](#troubleshooting)

## Overview

DocGen supports cross-platform development through a Docker-first approach, which provides a consistent environment across all platforms. This approach ensures that all dependencies are properly installed and that scripts run consistently regardless of the host operating system.

### Key Components

- **Docker Environment**: Contains all necessary dependencies for TypeScript and Python
- **Cross-Platform Script Runner**: Automatically detects your platform and runs the appropriate script
- **PowerShell Wrapper Scripts**: Allow Windows users to run scripts natively
- **Docker Command Utility**: Simplifies Docker operations

## Docker-Based Workflow (Recommended)

The Docker-based workflow is recommended for all platforms as it provides the most consistent experience.

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) installed and running
- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (v6 or later)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mprestonsparks/DocGen.git
   cd DocGen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Docker environment:
   ```bash
   npm run docker:start
   ```

### Common Tasks

- **Run the interview**:
  ```bash
  npm run docker:interview
  ```

- **Validate documentation**:
  ```bash
  npm run docker:validate
  ```

- **Run tests**:
  ```bash
  npm run docker:test
  ```

- **Execute a custom command in Docker**:
  ```bash
  npm run docker:exec -- <command>
  ```
  Example:
  ```bash
  npm run docker:exec -- npm run lint
  ```

## Native Workflow

For users who prefer to run DocGen natively, we provide platform-specific scripts.

### macOS/Linux

1. Clone the repository:
   ```bash
   git clone https://github.com/mprestonsparks/DocGen.git
   cd DocGen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run scripts directly:
   ```bash
   # Start the interview
   npm run interview
   
   # Start MCP servers
   npm run mcp:start
   
   # Run the GitHub workflow
   npm run github:workflow
   
   # Run the get-to-work script
   npm run get-to-work
   ```

### Windows

1. Clone the repository:
   ```powershell
   git clone https://github.com/mprestonsparks/DocGen.git
   cd DocGen
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Run scripts using the cross-platform runner:
   ```powershell
   # Start the interview
   npm run interview
   
   # Start MCP servers
   npm run mcp:start
   
   # Run the GitHub workflow
   npm run github:workflow
   
   # Run the get-to-work script
   npm run get-to-work
   ```

## Windows-Specific Instructions

Windows users have two options for running DocGen:

1. **Docker-Based Workflow** (Recommended): Uses Docker to provide a Linux-like environment
2. **Native Workflow**: Uses PowerShell scripts to run commands natively

### PowerShell Scripts

The following PowerShell scripts are available for Windows users:

- `get-to-work.ps1`: Starts the interactive workflow
- `mcp-servers/start-mcp-servers.ps1`: Starts the MCP servers
- `scripts/run-github-workflow.ps1`: Runs the GitHub workflow
- `scripts/run-monitoring.ps1`: Runs the monitoring script

These scripts can be run directly from PowerShell:

```powershell
# Run directly
.\get-to-work.ps1

# Or use the npm script (recommended)
npm run get-to-work
```

### Cross-Platform Script Runner

The cross-platform script runner (`scripts/cross-platform.js`) automatically detects your platform and runs the appropriate script:

```powershell
# Show help
node --experimental-modules scripts/cross-platform.js --help

# Run a script
node --experimental-modules scripts/cross-platform.js get-to-work
```

## Troubleshooting

### Docker Issues

- **Docker container not starting**:
  ```bash
  # Check Docker status
  npm run docker:status
  
  # Restart Docker container
  npm run docker:stop
  npm run docker:start
  ```

- **Permission issues with Docker**:
  - On Linux, make sure your user is in the `docker` group
  - On Windows, make sure Docker Desktop is running with the correct permissions

### Windows-Specific Issues

- **PowerShell execution policy**:
  If you encounter execution policy errors, run PowerShell as Administrator and execute:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

- **Path issues**:
  If you encounter path-related issues, make sure to use the cross-platform script runner:
  ```powershell
  npm run get-to-work
  ```
  Instead of calling the PowerShell script directly.

### Module Format Issues

- **ESM vs CommonJS**:
  If you encounter module format issues, use the `--experimental-modules` flag:
  ```bash
  node --experimental-modules scripts/cross-platform.js get-to-work
  ```

For additional help or to report issues, please open an issue on the [GitHub repository](https://github.com/mprestonsparks/DocGen/issues).
