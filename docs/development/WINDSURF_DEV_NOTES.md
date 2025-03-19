# Windsurf Integration: Developer Notes

## Overview

This document provides technical details about the DocGen-Windsurf integration for developers maintaining the codebase.

## Architecture

The integration follows a provider-based architecture:

```
src/ai-provider/
├── detect.js           # OS detection and provider selection
├── factory.js          # Factory pattern to create appropriate provider
├── provider-interface.js # Interface all providers must implement
├── configure-windsurf.js # CLI tool for Windsurf configuration
└── providers/
    └── windsurf.js     # Windsurf IDE provider implementation
```

### Key Components

1. **AI Provider Detection**
   - OS-based detection selects the appropriate provider
   - Windows uses Windsurf, macOS uses Claude Code
   - Environment variables can override the default selection

2. **Provider Interface**
   - Abstract interface with standard methods
   - Ensures consistent API across providers
   - Methods: `initialize()`, `isAvailable()`, `configureMCP()`, `getInfo()`

3. **Windsurf Provider**
   - Windows-specific implementation
   - Configures Windsurf's MCP settings
   - Maps DocGen MCP servers to Windsurf's expected format

4. **Configuration Script**
   - CLI tool for Windsurf MCP configuration
   - Detects Windsurf installation
   - Creates/updates Windsurf MCP config file

### Configuration Details

The Windsurf provider writes configuration to:
```
%USERPROFILE%\.codeium\windsurf\mcp_config.json
```

Example configuration:
```json
{
  "mcpServers": {
    "docgen-github": {
      "command": "node",
      "args": ["C:/path/to/DocGen/mcp-servers/github-issues/server.cjs"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
        "GITHUB_OWNER": "${env:GITHUB_OWNER}",
        "GITHUB_REPO": "${env:GITHUB_REPO}",
        "PORT": "7867"
      }
    },
    "docgen-coverage": {
      "command": "node",
      "args": ["C:/path/to/DocGen/mcp-servers/coverage-analysis/server.cjs"],
      "env": {
        "PORT": "7868"
      }
    }
  }
}
```

## Implementation Notes

1. **Platform-Specific Code**
   - All Windsurf-specific code is isolated in `src/ai-provider/`
   - Code is only executed on Windows platforms
   - No changes to macOS/Claude Code implementation

2. **Script Execution**
   - The `get-to-work.ps1` script calls `mcp-servers/start-mcp-servers.ps1`
   - This starts the MCP servers and configures Windsurf
   - The configuration is optional (controlled by `-ConfigureWindsurf` parameter)

3. **MCP Configuration**
   - DocGen MCP servers must be running for Windsurf to access them
   - Server paths are resolved to absolute paths for reliability
   - Environment variables are passed through to Windsurf

## Future Enhancements

1. **Additional IDE Support**
   - The provider pattern allows for future IDE integrations
   - Placeholder code exists for VSCode and Cursor
   - New providers can be added by implementing the interface

2. **Enhanced Configuration**
   - GUI-based configuration tool
   - Auto-detection of configuration issues
   - Better error handling and recovery

3. **Performance Optimization**
   - Startup time improvements
   - Memory usage optimization

## Known Limitations

1. **Platform-Specific Behaviors**
   - Some features may work differently between Windsurf and Claude Code
   - Error handling may differ between platforms

2. **Environment Variables**
   - Environment variable passing between DocGen and Windsurf can be fragile
   - Use explicit environment file paths where possible

3. **Startup Dependencies**
   - MCP servers must be running before using Windsurf
   - Docker container management can add complexity