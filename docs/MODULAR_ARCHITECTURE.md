# DocGen Modular Architecture

This document describes the modular architecture of DocGen, which separates core functionality from platform-specific features, particularly Claude Code integration.

## Overview

DocGen has been refactored to use a modular architecture that:

1. Separates core functionality from Claude-specific features
2. Provides a unified command interface for all platforms
3. Ensures that core functionality is available to all developers
4. Makes Claude-specific features optional and conditionally included

## Directory Structure

The modular architecture is organized as follows:

```
DocGen/
├── scripts/
│   ├── core/                 # Core modules available to all developers
│   │   ├── project-analyzer.cjs
│   │   ├── mcp-server-manager.cjs
│   │   └── workflow-manager.cjs
│   ├── claude/               # Claude-specific modules
│   │   └── claude-workflow-manager.cjs
│   └── developer/            # Developer-specific utilities
├── docgen.js                 # Unified command interface
├── docgen.ps1                # PowerShell wrapper for Windows
├── get-to-work.sh            # Bash wrapper for Unix
└── get-to-work.ps1           # PowerShell wrapper for Windows
```

## Core Modules

The core modules provide functionality that is available to all developers, regardless of whether they're using Claude Code:

### project-analyzer.cjs

This module analyzes the DocGen project state, including:
- Test status
- Code coverage
- Implementation gaps
- Repository structure

### mcp-server-manager.cjs

This module manages MCP servers, including:
- Checking if servers are running
- Starting servers
- Stopping servers
- Getting server status

### workflow-manager.cjs

This module manages development workflows, including:
- Analyzing project state
- Determining optimal workflow
- Providing guidance for next steps

## Claude-Specific Modules

The Claude-specific modules provide functionality that integrates with Claude Code:

### claude-workflow-manager.cjs

This module extends the core workflow manager with Claude-specific functionality:
- Analyzing project structure with Claude
- Generating documentation with Claude
- Suggesting test improvements with Claude

## Unified Command Interface

The `docgen.js` command interface provides a consistent way to interact with DocGen across all platforms:

```bash
# Initialize the development workflow
node docgen.js init

# Check if MCP servers are running
node docgen.js check-servers

# Start MCP servers
node docgen.js start-servers

# Check test status
node docgen.js check-tests

# Analyze project state
node docgen.js analyze

# Toggle Claude features on/off
node docgen.js toggle-claude
```

## Claude Code Integration (Optional)

DocGen can optionally integrate with Claude Code for enhanced AI capabilities. These features are only available when the `ENABLE_CLAUDE_FEATURES` environment variable is set to `true`:

```bash
# Enable Claude features
node docgen.js toggle-claude

# Analyze project structure with Claude
node docgen.js claude-analyze

# Generate documentation with Claude
node docgen.js claude-docs

# Suggest test improvements with Claude
node docgen.js claude-tests
```

## Platform-Specific Wrappers

DocGen provides platform-specific wrappers to ensure a consistent experience across all platforms:

### get-to-work.sh (Unix)

This script provides a Unix-compatible entry point for the DocGen workflow.

### get-to-work.ps1 (Windows)

This script provides a Windows-compatible entry point for the DocGen workflow.

## Environment Variables

The modular architecture uses environment variables to control feature flags:

### ENABLE_CLAUDE_FEATURES

This environment variable controls whether Claude-specific features are enabled:

```
ENABLE_CLAUDE_FEATURES=true|false
```

When set to `true`, Claude-specific features are enabled. When set to `false`, only core functionality is available.

## Cross-Platform Compatibility

The modular architecture is designed to work seamlessly across Windows, macOS, and Linux:

- **Docker-First Approach**: The recommended way to use DocGen is through Docker, which provides a consistent environment across all platforms.
- **Platform-Specific Scripts**: For users who prefer to run DocGen natively, platform-specific scripts are provided.
- **Unified Command Interface**: The `docgen.js` command interface provides a consistent way to interact with DocGen across all platforms.

## Extending the Architecture

The modular architecture is designed to be easily extended:

1. **Adding Core Functionality**: Add new modules to the `scripts/core/` directory.
2. **Adding Claude-Specific Functionality**: Add new modules to the `scripts/claude/` directory.
3. **Adding Developer Utilities**: Add new modules to the `scripts/developer/` directory.
4. **Adding New Commands**: Update the `docgen.js` command interface to include new commands.

## Best Practices

When working with the modular architecture, follow these best practices:

1. **Keep Core and Claude-Specific Functionality Separate**: Core functionality should be available to all developers, while Claude-specific functionality should be conditionally included.
2. **Use Environment Variables for Feature Flags**: Use environment variables to control feature flags, rather than hardcoding values.
3. **Provide Platform-Specific Wrappers**: Ensure that all functionality is available across all platforms by providing platform-specific wrappers.
4. **Document New Modules and Commands**: Update the documentation to include new modules and commands.
5. **Test Across All Platforms**: Test new functionality across all platforms to ensure cross-platform compatibility.
