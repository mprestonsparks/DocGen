# Windsurf IDE Integration Guide for Windows Users

## Overview

This guide helps Windows users set up DocGen with Windsurf IDE to provide an AI-assisted development experience similar to Claude Code on macOS. By following these instructions, you'll be able to use DocGen's MCP servers from within Windsurf's Cascade AI interface.

## Prerequisites

Before getting started, ensure you have:

1. **Windows 10 or 11** operating system
2. **Node.js 18+** installed and accessible via command line
3. **DocGen repository** cloned and dependencies installed
4. **Windsurf IDE** installed on your system
   - If you haven't installed Windsurf yet, download it from: [Windsurf IDE](https://www.codeium.com/windsurf)

## Setup Steps

### 1. Verify DocGen Installation

Ensure that DocGen is properly installed and working:

```powershell
# Navigate to your DocGen directory
cd C:\path\to\DocGen

# Install dependencies if you haven't already
npm install

# Verify DocGen is working
npm run docgen
```

You should see the DocGen command interface with available commands.

### 2. Start MCP Servers

DocGen uses Model Context Protocol (MCP) servers to provide GitHub issues and test coverage functionality. Start these servers:

```powershell
# Start MCP servers using the cross-platform script
npm run mcp:start
```

This will start the following MCP servers:
- GitHub Issues MCP (Port 7867)
- Coverage Analysis MCP (Port 7868)

### 3. Configure Windsurf Integration

Run the Windsurf configuration utility:

```powershell
# Configure Windsurf with DocGen MCP servers
npm run docgen:configure-windsurf

# Or using the docgen CLI
node docgen.js configure-windsurf
```

The utility will:
1. Detect your Windsurf installation
2. Create the necessary MCP configuration file
3. Configure Windsurf to connect to DocGen's MCP servers
4. Provide instructions for using the integration

### 4. Verify MCP Server Status

Ensure that the MCP servers are running correctly:

```powershell
# Check server status
npm run docgen:check-servers
```

You should see confirmation that both GitHub MCP and Coverage MCP servers are running.

## Using Windsurf with DocGen

Once configured, you can use DocGen's capabilities from within Windsurf:

1. **Launch Windsurf IDE**
   Open Windsurf from the Start menu or desktop shortcut

2. **Open Your Project**
   Open your DocGen project folder in Windsurf

3. **Access Cascade AI**
   - Press `Ctrl+L` to open the Cascade panel
   - Or click the Cascade icon in the sidebar

4. **Use DocGen MCP Commands**
   In the Cascade input box, you can now use commands like:
   
   ```
   @github getIssues --labels "implementation-gap"
   @coverage getCoverageMetrics
   ```

5. **Work with GitHub Issues**
   - Create, update, and query GitHub issues
   - Link issues to implementation gaps

6. **Analyze Test Coverage**
   - Get test coverage reports
   - Identify areas with missing tests
   - View coverage metrics

## Troubleshooting

### MCP Servers Not Starting

If the MCP servers don't start:

```powershell
# Check if Docker is running (if using Docker)
docker ps

# Try starting servers directly
node mcp-servers/github-issues/server.cjs
node mcp-servers/coverage-analysis/server.cjs
```

### Windsurf Configuration Issues

If Windsurf configuration fails:

1. Check if Windsurf is properly installed
2. Verify the configuration path:
   ```
   %USERPROFILE%\.codeium\windsurf\mcp_config.json
   ```
3. Try manually creating the configuration file with:
   ```json
   {
     "mcpServers": {
       "docgen-github": {
         "command": "node",
         "args": ["C:\\path\\to\\DocGen\\mcp-servers\\github-issues\\server.cjs"],
         "env": {
           "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
           "GITHUB_OWNER": "${env:GITHUB_OWNER}",
           "GITHUB_REPO": "${env:GITHUB_REPO}",
           "PORT": "7867"
         }
       },
       "docgen-coverage": {
         "command": "node",
         "args": ["C:\\path\\to\\DocGen\\mcp-servers\\coverage-analysis\\server.cjs"],
         "env": {
           "PORT": "7868"
         }
       }
     }
   }
   ```

### Cascade Not Showing MCP Tools

If Cascade doesn't show the MCP tools:

1. Restart Windsurf
2. Check that the MCP servers are running (npm run docgen:check-servers)
3. Verify that your GitHub token is properly set in the environment variables

## Environmental Variables

DocGen's GitHub functionality requires the following environment variables:

```
GITHUB_TOKEN=your_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name
```

Add these to your `.env` file or set them in your Windows environment variables.

## Getting Help

If you encounter issues or need assistance with Windsurf integration:

1. Check the DocGen documentation in the `docs/` directory
2. Run `npm run docgen:help` for command assistance
3. Create an issue on the DocGen GitHub repository

## Conclusion

With this setup, Windows users can enjoy DocGen's AI-assisted capabilities through Windsurf IDE, providing feature parity with the Claude Code experience on macOS. The integration allows you to leverage all of DocGen's MCP-based tools from within a modern, Windows-native development environment.